import {
  GoogleAuthProvider,
  signInWithCredential,
  type UserCredential,
} from "firebase/auth";
import { auth, googleClientId } from "@/lib/firebase";

// Google Identity Services (GIS) types — the global is loaded by the GIS
// <script> tag we inject on first use.
//
// We use the "Sign In With Google" button flow (accounts.id.renderButton)
// rather than the OAuth token model, because the button gives us an ID
// token directly via CredentialResponse.credential. The token model
// (initTokenClient) only returns an access_token by default and would
// require a server-side code exchange to get an id_token.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: CredentialResponse) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

interface CredentialResponse {
  credential: string;
  select_by?: string;
}

const GIS_SRC = "https://accounts.google.com/gsi/client";

let scriptPromise: Promise<void> | null = null;

/**
 * Inject the Google Identity Services script exactly once. Subsequent calls
 * resolve immediately. Rejects if the script fails to load (e.g., network
 * error, ad-blocker).
 */
export function loadGisScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Google Identity Services requires a browser environment."),
    );
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SRC}"]`,
    );
    const script = existing ?? document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    const onLoad = () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
      resolve();
    };
    const onError = () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
      scriptPromise = null;
      reject(new Error("Failed to load Google Identity Services."));
    };
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    if (!existing) document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Initialize the GIS callback. Once initialized, clicking the GIS-rendered
 * button opens Google's account-picker popup; success fires the callback
 * with the ID token credential.
 *
 * Requires `VITE_GOOGLE_CLIENT_ID` to be set. Get the value from the
 * Firebase console → Authentication → Sign-in method → Google → Web SDK
 * configuration → "Web client ID".
 */
export function initGoogleSignIn(callback: (idToken: string) => void): void {
  if (!googleClientId) {
    throw new Error(
      "Google sign-in requires VITE_GOOGLE_CLIENT_ID. Add the Web client ID from Firebase console → Authentication → Sign-in method → Google.",
    );
  }
  if (!window.google?.accounts?.id) {
    throw new Error("Google Identity Services is not loaded yet.");
  }
  window.google.accounts.id.initialize({
    client_id: googleClientId,
    callback: (response) => {
      if (response.credential) {
        callback(response.credential);
      }
    },
  });
}

/**
 * Mount the official Google "Sign In With Google" button into the given
 * element. The element's children will be replaced by the GIS button.
 * Returns a cleanup function that removes the button from the DOM.
 */
export function mountGoogleButton(parent: HTMLElement): () => void {
  if (!window.google?.accounts?.id) {
    throw new Error("Google Identity Services is not loaded yet.");
  }
  window.google.accounts.id.renderButton(parent, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "continue_with",
    shape: "rectangular",
    logo_alignment: "left",
    width: 320,
  });
  return () => {
    parent.replaceChildren();
  };
}

/**
 * Sign in with Google using Google Identity Services directly, then
 * exchange the resulting ID token for a Firebase credential.
 *
 * Why this exists: Firebase's built-in `signInWithPopup` and
 * `signInWithRedirect` both rely on a hidden cross-origin iframe on
 * `accounts.google.com` to complete the OAuth handshake. That iframe is
 * fragile on Safari — storage partitioning can cause `signInWithRedirect`
 * to lose its sessionStorage state, and `signInWithPopup` can hit
 * "Database is closing/hidden" IndexedDB errors.
 *
 * GIS's "Sign In With Google" button opens a top-level popup (not an
 * iframe), so neither Safari bug applies. The callback receives an ID
 * token directly, which we hand to Firebase via `signInWithCredential`.
 *
 * This module exposes `loadGisScript`, `initGoogleSignIn`, and
 * `mountGoogleButton` for the React auth page to render the button
 * in-place and let the click happen naturally. `signInWithGoogle` is the
 * non-React entry point used by tests or other code paths.
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  if (!auth) {
    throw new Error("Firebase is not configured.");
  }
  if (!googleClientId) {
    throw new Error(
      "Google sign-in requires VITE_GOOGLE_CLIENT_ID. Add the Web client ID from Firebase console → Authentication → Sign-in method → Google.",
    );
  }
  await loadGisScript();
  const idToken = await new Promise<string>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("Google sign-in was cancelled or timed out."));
    }, 5 * 60 * 1000);
    initGoogleSignIn((token) => {
      window.clearTimeout(timeout);
      resolve(token);
    });
  });
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}
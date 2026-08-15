import {
  GoogleAuthProvider,
  signInWithCredential,
  type UserCredential,
} from "firebase/auth";
import { auth, googleClientId } from "@/lib/firebase";

// Google Identity Services (GIS) types — the global is loaded by the GIS
// <script> tag we inject on first use. See
// https://developers.google.com/identity/oauth2/web/guides/use-token-model
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenClientResponse) => void;
            error_callback?: (err: TokenClientError) => void;
          }) => TokenClient;
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}

interface TokenClientResponse {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface TokenClientError {
  type: string;
  message?: string;
}

const GIS_SRC = "https://accounts.google.com/gsi/client";
const GIS_SCOPE = "openid email profile";

let scriptPromise: Promise<void> | null = null;

/**
 * Inject the Google Identity Services script exactly once. Subsequent calls
 * resolve immediately. Rejects if the script fails to load (e.g., network
 * error, ad-blocker).
 */
function loadGisScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Identity Services requires a browser environment."));
  }
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SRC}"]`,
    );
    // A previous failed load leaves a dead <script> that will never fire
    // load/error again. Remove it so retry injects a fresh one.
    if (existing && !window.google?.accounts?.oauth2) {
      existing.remove();
    }
    const script = document.createElement("script");
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
      script.remove();
      scriptPromise = null;
      reject(new Error("Failed to load Google Identity Services."));
    };
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Sign in with Google using Google Identity Services directly, then exchange
 * the resulting access token for a Firebase credential.
 *
 * Why this exists: Firebase's built-in `signInWithPopup` and
 * `signInWithRedirect` both rely on a hidden cross-origin iframe on
 * `accounts.google.com` to complete the OAuth handshake. That iframe is
 * fragile on Safari — storage partitioning can cause
 * `signInWithRedirect` to lose its sessionStorage state and
 * `signInWithPopup` to hit "Database is closing/hidden" IndexedDB errors.
 *
 * GIS `initTokenClient` (the token model) opens Google's account picker
 * without that iframe and returns an OAuth access token. Firebase accepts
 * the access token via `GoogleAuthProvider.credential(null, accessToken)`.
 * The token client never returns an ID token — that only comes from the
 * separate Sign In With Google (`google.accounts.id`) API.
 *
 * Requires `VITE_GOOGLE_CLIENT_ID` to be set. Get the value from the
 * Firebase console → Authentication → Sign-in method → Google → Web SDK
 * configuration → "Web client ID".
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

  const accessToken = await new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: GIS_SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(
            new Error(response.error_description ?? response.error),
          );
          return;
        }
        if (response.access_token) {
          resolve(response.access_token);
          return;
        }
        reject(new Error("Google did not return an access token."));
      },
      error_callback: (err) => {
        // GIS rejects via callback rather than throwing — surface a useful
        // message for the auth UI.
        if (err.type === "popup_closed") {
          reject(new Error("Google sign-in popup was closed before completing."));
        } else if (err.type === "popup_failed_to_open") {
          reject(new Error("Google sign-in popup could not be opened."));
        } else {
          reject(new Error(`Google sign-in failed: ${err.message ?? err.type}`));
        }
      },
    });
    client.requestAccessToken({ prompt: "" });
  });

  const credential = GoogleAuthProvider.credential(null, accessToken);
  return signInWithCredential(auth, credential);
}

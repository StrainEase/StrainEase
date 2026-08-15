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
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
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
 * Sign in with Google using Google Identity Services directly, then exchange
 * the resulting ID token for a Firebase credential.
 *
 * Why this exists: Firebase's built-in `signInWithPopup` and
 * `signInWithRedirect` both rely on a hidden cross-origin iframe on
 * `accounts.google.com` to complete the OAuth handshake. That iframe is
 * fragile on Safari — storage partitioning can cause
 * `signInWithRedirect` to lose its sessionStorage state and
 * `signInWithPopup` to hit "Database is closing/hidden" IndexedDB errors.
 *
 * GIS renders Google's UI directly without an iframe, and Firebase accepts
 * the resulting ID token via `signInWithCredential`, sidestepping both bugs.
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

  const idToken = await new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: GIS_SCOPE,
      callback: (response) => {
        if (response.id_token) {
          resolve(response.id_token);
        } else {
          reject(
            new Error(
              "Google did not return an ID token. Make sure 'openid' is included in the OAuth scope.",
            ),
          );
        }
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

  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}
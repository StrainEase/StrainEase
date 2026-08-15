import {
  OAuthProvider,
  signInWithPopup,
  type UserCredential,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

/**
 * Sign in with Apple via Firebase's OAuth provider.
 *
 * Apple doesn't have the GIS iframe Safari bug that forced the custom Google
 * path — Firebase opens Apple's own account sheet. Requires the Apple
 * provider in Firebase console to include a Services ID, Team ID, Key ID,
 * and the .p8 private key (Authentication → Sign-in method → Apple).
 */
export async function signInWithApple(): Promise<UserCredential> {
  if (!auth) {
    throw new Error("Firebase is not configured.");
  }
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  return signInWithPopup(auth, provider);
}

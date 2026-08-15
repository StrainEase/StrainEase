import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";

// Firebase web config. Fill these in the project's Keys/API keys tab as
// VITE_FIREBASE_* so the app can connect to your Firebase project.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  config.apiKey && config.projectId && config.authDomain,
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let functions: Functions | null = null;

if (isFirebaseConfigured) {
  app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: config.apiKey as string,
        authDomain: config.authDomain as string,
        projectId: config.projectId as string,
        storageBucket: config.storageBucket ?? undefined,
        messagingSenderId: config.messagingSenderId ?? undefined,
        appId: config.appId ?? undefined,
      });
  auth = getAuth(app);
  db = getFirestore(app);
  // Defaults to the us-central1 region — match the region in functions/src/index.ts.
  functions = getFunctions(app);
}

export { app, auth, db, functions };

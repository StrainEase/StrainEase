import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";

export type AuthUser = {
  uid: string;
  email: string | null;
  name: string;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setIsLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser({
          uid: u.uid,
          email: u.email,
          name: u.displayName || (u.email ? u.email.split("@")[0] : "Patient"),
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // `signOut` is a stable callback bound to the imported `auth` reference —
  // useCallback keeps the same function identity across renders so consumers
  // that destructure it (e.g. inside `useEffect` deps) don't re-fire.
  const signOut = useCallback(async () => {
    if (auth) await fbSignOut(auth);
  }, []);

  // Memoize the returned object so consumers that subscribe to a single
  // field (e.g. `<AppHeader>` reads only `user`) don't re-render on every
  // auth state change. Without `useMemo`, the object literal would be a
  // new reference every render and break downstream `React.memo` /
  // dependency arrays.
  return useMemo(
    () => ({
      isLoading,
      isAuthenticated: user !== null,
      user,
      signOut,
    }),
    [isLoading, user, signOut],
  );
}

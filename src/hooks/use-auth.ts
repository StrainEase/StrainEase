import { useEffect, useState } from "react";
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

  return {
    isLoading,
    isAuthenticated: user !== null,
    user,
    signOut: async () => {
      if (auth) await fbSignOut(auth);
    },
  };
}

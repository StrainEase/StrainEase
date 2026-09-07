import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { listenToCheckIns, type CheckIn } from "@/lib/check-ins";

/**
 * Live list of the signed-in user's daily check-ins, newest date first.
 *
 * The hook stays a thin wrapper around `listenToCheckIns` so the rest of
 * the app never imports `firebase/firestore` directly. If Firebase isn't
 * configured or the user is signed out, the list stays empty.
 */
export function useCheckIns(): {
  checkIns: CheckIn[];
  isLoading: boolean;
} {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCheckIns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return listenToCheckIns(user.uid, (next) => {
      setCheckIns(next);
      setLoading(false);
    });
  }, [user?.uid]);

  return { checkIns, isLoading };
}

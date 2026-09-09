import { useEffect, useState } from "react";
import {
  listenToThcSensitivity,
  saveThcSensitivity,
  type ThcSensitivity,
} from "@/lib/thc-sensitivity";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";

export type UseThcSensitivity = {
  value: ThcSensitivity | null;
  save: (next: ThcSensitivity | null) => Promise<void>;
  isLoading: boolean;
};

export function useThcSensitivity(): UseThcSensitivity {
  const { user } = useAuth();
  const [value, setValue] = useState<ThcSensitivity | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user) {
      setValue(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return listenToThcSensitivity(user.uid, (next) => {
      setValue(next);
      setLoading(false);
    });
  }, [user?.uid]);

  const save = (next: ThcSensitivity | null) =>
    user ? saveThcSensitivity(user.uid, next) : Promise.resolve();

  return { value, save, isLoading };
}

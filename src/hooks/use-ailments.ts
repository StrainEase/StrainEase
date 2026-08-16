import { useEffect, useState } from "react";
import { listenToAilments, saveAilments } from "@/lib/ailments";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";

export type UseAilments = {
  names: string[];
  save: (next: string[]) => Promise<void>;
  toggle: (name: string) => Promise<void>;
  isLoading: boolean;
};

export function useAilments(): UseAilments {
  const { user } = useAuth();
  const [names, setNames] = useState<string[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user) {
      setNames([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return listenToAilments(user.uid, (next) => {
      setNames(next);
      setLoading(false);
    });
  }, [user?.uid]);

  const save = (next: string[]) =>
    user ? saveAilments(user.uid, next) : Promise.resolve();

  const toggle = (name: string) => {
    const key = name.trim().toLowerCase();
    const next = names.some((item) => item.toLowerCase() === key)
      ? names.filter((item) => item.toLowerCase() !== key)
      : [...names, name.trim()];
    return save(next);
  };

  return { names, save, toggle, isLoading };
}

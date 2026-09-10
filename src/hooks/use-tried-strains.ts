import { useEffect, useState } from "react";
import {
  addTriedStrain,
  listenToTriedStrains,
  removeTriedStrain,
  type TriedStrainDoc,
} from "@/lib/tried-strains";
import { useAuth } from "@/hooks/use-auth";

export type UseTriedStrains = {
  /** Sorted newest first. Empty array until the first snapshot arrives. */
  list: TriedStrainDoc[];
  /** Names only, for prefilling search. */
  names: string[];
  add: (strain: { name: string; type?: string; thc?: string }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** True until the first snapshot resolves. */
  isLoading: boolean;
};

export function useTriedStrains(): UseTriedStrains {
  const { user } = useAuth();
  const [list, setList] = useState<TriedStrainDoc[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return listenToTriedStrains(user.uid, (next) => {
      setList(next);
      setLoading(false);
    });
  }, [user?.uid]);

  return {
    list,
    names: list.map((m) => m.name),
    add: (strain) =>
      user ? addTriedStrain(user.uid, strain.name, strain.type, strain.thc) : Promise.resolve(),
    remove: (id) => (user ? removeTriedStrain(user.uid, id) : Promise.resolve()),
    isLoading,
  };
}

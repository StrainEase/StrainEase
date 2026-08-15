import { useEffect, useState } from "react";
import {
  addMedication,
  listenToMedications,
  removeMedication,
  type MedicationDoc,
} from "@/lib/medications";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";

export type UseMedications = {
  /** Sorted newest first. Empty array until the first snapshot arrives. */
  list: MedicationDoc[];
  /** Names only, for prefilling search prefs.medications. */
  names: string[];
  add: (name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** True until the first snapshot resolves. */
  isLoading: boolean;
};

export function useMedications(): UseMedications {
  const { user } = useAuth();
  const [list, setList] = useState<MedicationDoc[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return listenToMedications(user.uid, (next) => {
      setList(next);
      setLoading(false);
    });
  }, [user?.uid]);

  return {
    list,
    names: list.map((m) => m.name),
    add: (name) => (user ? addMedication(user.uid, name) : Promise.resolve()),
    remove: (id) =>
      user ? removeMedication(user.uid, id) : Promise.resolve(),
    isLoading,
  };
}
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";

export type TriedStrainDoc = {
  id: string;
  name: string;
  type: string;
  thc: string;
  addedAt: number;
};

export type UseTriedStrains = {
  list: TriedStrainDoc[];
  names: string[];
  add: (strain: { name: string; type: string; thc: string }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  isLoading: boolean;
};

export function useTriedStrains(): UseTriedStrains {
  const { user } = useAuth();
  const [list, setList] = useState<TriedStrainDoc[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user) {
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
    names: list.map((s) => s.name),
    add: (strain) =>
      user ? addTriedStrain(user.uid, strain) : Promise.resolve(),
    remove: (id) =>
      user ? removeTriedStrain(user.uid, id) : Promise.resolve(),
    isLoading,
  };
}

const coll = (uid: string) => collection(db!, "users", uid, "triedStrains");

export async function addTriedStrain(
  uid: string,
  strain: { name: string; type: string; thc: string },
): Promise<void> {
  const trimmed = strain.name.trim();
  if (trimmed === "") throw new Error("Strain name can't be empty.");
  // Reject exact-name duplicates (case-insensitive)
  const existing = await getDocs(
    query(coll(uid), where("name", "==", trimmed)),
  );
  if (!existing.empty) return;
  await addDoc(coll(uid), {
    name: trimmed,
    type: strain.type,
    thc: strain.thc,
    addedAt: Date.now(),
  });
}

export async function removeTriedStrain(
  uid: string,
  strainId: string,
): Promise<void> {
  await deleteDoc(doc(coll(uid), strainId));
}

export function listenToTriedStrains(
  uid: string,
  cb: (list: TriedStrainDoc[]) => void,
): Unsubscribe {
  return onSnapshot(
    query(coll(uid)),
    (snap) => {
      const list: TriedStrainDoc[] = [];
      snap.forEach((d) => {
        const data = d.data() as {
          name?: string;
          type?: string;
          thc?: string;
          addedAt?: number;
        };
        list.push({
          id: d.id,
          name: data.name ?? d.id,
          type: data.type ?? "hybrid",
          thc: data.thc ?? "",
          addedAt: data.addedAt ?? 0,
        });
      });
      cb(list.sort((a, b) => b.addedAt - a.addedAt));
    },
    () => {
      cb([]);
    },
  );
}

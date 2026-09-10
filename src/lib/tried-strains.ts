// Persistent tried strains list for each user. Stored as a subcollection so
// each strain is its own document and the list can be edited without
// rewriting the whole user doc.
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
import { db } from "./firebase";

export type TriedStrainDoc = {
  id: string;
  name: string;
  type: string;
  thc: string;
  addedAt: number;
};

const coll = (uid: string) => collection(db!, "users", uid, "triedStrains");

export async function addTriedStrain(
  uid: string,
  name: string,
  type: string = "",
  thc: string = ""
): Promise<void> {
  const trimmed = name.trim();
  if (trimmed === "") throw new Error("Strain name can't be empty.");
  // Reject exact-name duplicates (case-insensitive)
  const existing = await getDocs(
    query(coll(uid), where("name", "==", trimmed)),
  );
  if (!existing.empty) return;
  await addDoc(coll(uid), {
    name: trimmed,
    type: type || "",
    thc: thc || "",
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
        const data = d.data() as { name?: string; type?: string; thc?: string; addedAt?: number };
        list.push({
          id: d.id,
          name: data.name ?? d.id,
          type: data.type ?? "",
          thc: data.thc ?? "",
          addedAt: data.addedAt ?? 0,
        });
      });
      // Newest first.
      cb(list.sort((a, b) => b.addedAt - a.addedAt));
    },
    () => {
      // Rules not set up yet / offline — stay silent.
      cb([]);
    },
  );
}

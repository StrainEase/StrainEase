// Persistent medication list for each user. Stored as a subcollection so
// each medication is its own document and the list can be edited without
// rewriting the whole user doc. The hook in src/hooks/use-medications.ts
// flattens the docs to a string[] for callers.
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

export type MedicationDoc = {
  id: string;
  name: string;
  addedAt: number;
};

const coll = (uid: string) => collection(db!, "users", uid, "medications");

/** Firestore medications create requires name.size() < 80. */
export const MEDICATION_NAME_MAX = 79;

export function clipMedicationName(text: string): string {
  return text.trim().slice(0, MEDICATION_NAME_MAX);
}

export async function addMedication(
  uid: string,
  name: string,
): Promise<void> {
  const trimmed = clipMedicationName(name);
  if (trimmed === "") throw new Error("Medication name can't be empty.");
  // Reject exact-name duplicates (case-insensitive) so the list stays clean.
  const existing = await getDocs(
    query(coll(uid), where("name", "==", trimmed)),
  );
  if (!existing.empty) return;
  await addDoc(coll(uid), {
    name: trimmed,
    addedAt: Date.now(),
  });
}

export async function removeMedication(
  uid: string,
  medicationId: string,
): Promise<void> {
  await deleteDoc(doc(coll(uid), medicationId));
}

export function listenToMedications(
  uid: string,
  cb: (list: MedicationDoc[]) => void,
): Unsubscribe {
  return onSnapshot(
    query(coll(uid)),
    (snap) => {
      const list: MedicationDoc[] = [];
      snap.forEach((d) => {
        const data = d.data() as { name?: string; addedAt?: number };
        list.push({
          id: d.id,
          name: data.name ?? d.id,
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
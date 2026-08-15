import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { StrainProfile, StrainType } from "./strain-profile";

export type SavedNote = {
  id: string;
  text: string;
  isPublic: boolean;
  createdAt: number;
  /** id of the doc in the publicNotes collection when this note is public. */
  publicId?: string;
};

export type SavedStrain = {
  slug: string;
  name: string;
  type?: StrainType;
  thcRange?: string;
  savedAt: number;
  notes: SavedNote[];
};

export type PublicNote = {
  id: string;
  strainKey: string;
  strainName: string;
  note: string;
  authorName: string;
  createdAt: number;
};

/** Firestore publicNotes create requires note.size() < 2000. */
export const PUBLIC_NOTE_MAX = 1999;

export function clipPublicNote(text: string): string {
  return text.trim().slice(0, PUBLIC_NOTE_MAX);
}

export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const savedColl = (uid: string) => collection(db!, "users", uid, "savedStrains");
const publicNotesColl = () => collection(db!, "publicNotes");

export function listenToSavedStrains(
  uid: string,
  cb: (list: SavedStrain[]) => void,
): Unsubscribe {
  return onSnapshot(
    query(savedColl(uid)),
    (snap) => {
      const list: SavedStrain[] = [];
      snap.forEach((d) => {
        const data = d.data() as {
          name?: string;
          type?: StrainType;
          thcRange?: string;
          savedAt?: number;
          notes?: SavedNote[];
        };
        list.push({
          slug: d.id,
          name: data.name ?? d.id,
          type: data.type,
          thcRange: data.thcRange,
          savedAt: data.savedAt ?? 0,
          notes: Array.isArray(data.notes) ? data.notes : [],
        });
      });
      cb(list.sort((a, b) => b.savedAt - a.savedAt));
    },
    () => {
      // Rules not set up yet / offline — stay silent.
    },
  );
}

/** Fields written on save. Notes are omitted so a re-save cannot wipe them. */
export function savedStrainFields(
  profile: StrainProfile,
  savedAt = Date.now(),
) {
  return {
    name: profile.name,
    type: profile.type ?? null,
    thcRange: profile.thcRange ?? null,
    savedAt,
  };
}

export async function saveStrain(
  uid: string,
  profile: StrainProfile,
): Promise<void> {
  const slug = slugify(profile.name);
  if (!slug) throw new Error("That name can't be saved.");
  await setDoc(doc(savedColl(uid), slug), savedStrainFields(profile), {
    merge: true,
  });
}

export async function removeSavedStrain(uid: string, slug: string) {
  await deleteDoc(doc(savedColl(uid), slug));
}

export async function isStrainSaved(uid: string, slug: string): Promise<boolean> {
  const snap = await getDoc(doc(savedColl(uid), slug));
  return snap.exists();
}

async function readNotes(uid: string, slug: string): Promise<SavedNote[]> {
  const snap = await getDoc(doc(savedColl(uid), slug));
  const data = snap.data() as { notes?: SavedNote[] } | undefined;
  return Array.isArray(data?.notes) ? data.notes : [];
}

async function writeNotes(uid: string, slug: string, notes: SavedNote[]) {
  await setDoc(doc(savedColl(uid), slug), { notes }, { merge: true });
}

export async function addNote(
  uid: string,
  slug: string,
  text: string,
  isPublic: boolean,
  authorName: string,
  strainName: string,
): Promise<SavedNote> {
  const trimmed = clipPublicNote(text);
  if (trimmed === "") throw new Error("Note can't be empty.");

  const note: SavedNote = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: trimmed,
    isPublic: false,
    createdAt: Date.now(),
  };

  if (isPublic) {
    note.isPublic = true;
    note.publicId = await publishNote(uid, note, authorName, strainName);
  }

  const notes = await readNotes(uid, slug);
  await writeNotes(uid, slug, [...notes, note]);
  return note;
}

export async function setNotePublic(
  uid: string,
  slug: string,
  noteId: string,
  isPublic: boolean,
  authorName: string,
  strainName: string,
) {
  const notes = await readNotes(uid, slug);
  const next = await Promise.all(
    notes.map(async (n) => {
      if (n.id !== noteId) return n;
      if (isPublic && !n.publicId) {
        const publicId = await publishNote(uid, n, authorName, strainName);
        return { ...n, isPublic: true, publicId };
      }
      if (!isPublic && n.publicId) {
        await deleteDoc(doc(publicNotesColl(), n.publicId)).catch(() => {});
        return { ...n, isPublic: false, publicId: undefined };
      }
      return { ...n, isPublic };
    }),
  );
  await writeNotes(uid, slug, next);
}

export async function removeNote(
  uid: string,
  slug: string,
  noteId: string,
) {
  const notes = await readNotes(uid, slug);
  const target = notes.find((n) => n.id === noteId);
  if (target?.publicId) {
    await deleteDoc(doc(publicNotesColl(), target.publicId)).catch(() => {});
  }
  await writeNotes(
    uid,
    slug,
    notes.filter((n) => n.id !== noteId),
  );
}

async function publishNote(
  uid: string,
  note: SavedNote,
  authorName: string,
  strainName: string,
): Promise<string> {
  const ref = await addDoc(publicNotesColl(), {
    strainKey: slugify(strainName),
    strainName,
    note: clipPublicNote(note.text),
    authorName: authorName || "A patient",
    uid,
    createdAt: Date.now(),
  });
  return ref.id;
}

export function listenToPublicNotes(
  strainKey: string,
  cb: (notes: PublicNote[]) => void,
): Unsubscribe {
  return onSnapshot(
    query(publicNotesColl(), where("strainKey", "==", strainKey)),
    (snap) => {
      const notes: PublicNote[] = [];
      snap.forEach((d) => {
        const data = d.data() as Omit<PublicNote, "id">;
        notes.push({ id: d.id, ...data });
      });
      cb(notes.sort((a, b) => b.createdAt - a.createdAt));
    },
    () => {
      // Rules not set up yet / offline — stay silent.
    },
  );
}

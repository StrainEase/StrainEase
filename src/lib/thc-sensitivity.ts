import {
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Closed set of THC sensitivity levels the patient can pick in
 * account settings. Mirrors the iOS `ThcSensitivity` enum and the
 * enum the Kaya prompts already understand, so a value written
 * from one client round-trips through the others without
 * translation.
 */
export const THC_SENSITIVITY_VALUES = [
  "anxious-high-thc",
  "moderate-tolerance",
  "experienced",
] as const;

export type ThcSensitivity = (typeof THC_SENSITIVITY_VALUES)[number];

/** Display labels for the settings chip picker, in the order shown. */
export const THC_SENSITIVITY_OPTIONS: { value: ThcSensitivity; label: string; description: string }[] = [
  {
    value: "anxious-high-thc",
    label: "Anxious around high-THC",
    description: "High-THC flower tends to spike my anxiety. Prefer gentler options.",
  },
  {
    value: "moderate-tolerance",
    label: "Moderate tolerance",
    description: "I have some experience but prefer to be mindful of potency levels.",
  },
  {
    value: "experienced",
    label: "Experienced with stronger flower",
    description: "I have a higher tolerance; honest potency reads are fine.",
  },
];

/** Human-readable label for a stored value, or null when unset. */
export function thcSensitivityLabel(value: ThcSensitivity | null): string | null {
  if (!value) return null;
  return THC_SENSITIVITY_OPTIONS.find((opt) => opt.value === value)?.label ?? null;
}

/** Coerce a Firestore value into the closed enum, dropping anything else. */
export function normalizeThcSensitivity(raw: unknown): ThcSensitivity | null {
  if (typeof raw !== "string") return null;
  return (THC_SENSITIVITY_VALUES as readonly string[]).includes(raw)
    ? (raw as ThcSensitivity)
    : null;
}

export function thcSensitivityCloudData(
  value: ThcSensitivity | null,
  updatedAt = Date.now(),
) {
  if (!value) {
    return {
      thcSensitivity: null,
      thcSensitivityUpdatedAt: updatedAt,
    };
  }
  return {
    thcSensitivity: value,
    thcSensitivityUpdatedAt: updatedAt,
  };
}

export async function saveThcSensitivity(
  uid: string,
  value: ThcSensitivity | null,
): Promise<void> {
  if (!db) return;
  await setDoc(
    doc(db, "users", uid),
    thcSensitivityCloudData(value),
    { merge: true },
  );
}

export function listenToThcSensitivity(
  uid: string,
  cb: (value: ThcSensitivity | null) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db!, "users", uid),
    (snap) => {
      cb(normalizeThcSensitivity(snap.data()?.thcSensitivity));
    },
    () => cb(null),
  );
}

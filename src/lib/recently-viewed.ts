import { profileSlug, uniqueProfiles } from "@/lib/strain-catalog";
import type { StrainProfile } from "@/lib/strain-profile";

const KEY = "recentlyViewedStrains.v1";
const LIMIT = 24;
const CHANGED = "recently-viewed-changed";

function compact(profile: StrainProfile): StrainProfile {
  return {
    name: profile.name,
    inKnowledgeBase: profile.inKnowledgeBase,
    type: profile.type,
    thcRange: profile.thcRange,
    imageUrl: profile.imageUrl,
    medicalUses: profile.medicalUses,
  };
}

export function loadRecentlyViewed(): StrainProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const profiles: StrainProfile[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const name = (item as { name?: unknown }).name;
      if (typeof name !== "string" || name.trim() === "") continue;
      const rec = item as Partial<StrainProfile>;
      profiles.push({
        name,
        inKnowledgeBase: rec.inKnowledgeBase === true,
        type: rec.type,
        thcRange: typeof rec.thcRange === "string" ? rec.thcRange : undefined,
        imageUrl: typeof rec.imageUrl === "string" ? rec.imageUrl : undefined,
        medicalUses: Array.isArray(rec.medicalUses)
          ? rec.medicalUses.filter((use): use is string => typeof use === "string")
          : undefined,
      });
    }
    return uniqueProfiles(profiles).slice(0, LIMIT);
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(profile: StrainProfile): void {
  if (typeof window === "undefined" || !profile.name.trim()) return;
  const slug = profileSlug(profile);
  const next = uniqueProfiles([
    compact(profile),
    ...loadRecentlyViewed().filter((item) => profileSlug(item) !== slug),
  ]).slice(0, LIMIT);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGED));
  } catch {
    // Quota / private mode — skip persist; the in-session list still updates callers.
  }
}

export function subscribeRecentlyViewed(
  callback: (items: StrainProfile[]) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback(loadRecentlyViewed());
  window.addEventListener(CHANGED, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGED, handler);
    window.removeEventListener("storage", handler);
  };
}

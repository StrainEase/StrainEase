// Router-state helpers for the strain page.
//
// The home screen's posters hand their profile to the strain page
// through the router state. The strain page then paints the photo that
// was already fetched and cached on device instead of resolving a
// second URL and paying for the image again.

import { slugify } from "@/lib/saved-strains";
import type { StrainProfile } from "@/lib/strain-profile";

/**
 * Pull the profile the user clicked out of the router state.
 *
 * The state survives navigation, so a stale entry from a previously
 * visited strain must not win: the profile only counts when it is the
 * strain the page is showing. Returns null for a missing, malformed,
 * or mismatched state.
 */
export function readNavigatedProfile(
  state: unknown,
  slug: string,
): StrainProfile | null {
  if (!state || typeof state !== "object") return null;
  const profile = (state as { profile?: StrainProfile }).profile;
  if (!profile || typeof profile.name !== "string" || profile.name === "") {
    return null;
  }
  if (slugify(profile.name) !== slug) return null;
  return profile;
}

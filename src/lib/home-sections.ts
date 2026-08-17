import { slugify } from "@/lib/saved-strains";
import {
  applyCatalogPhotos,
  matchAilments,
  matchingAilment,
  mergeCatalog,
} from "@/lib/strain-catalog";
import type { StrainProfile } from "@/lib/strain-profile";
import { CONDITIONS } from "@/lib/strain-ui";

export const HOME_PREVIEW_LIMIT = 6;

export type HomeSection =
  | { kind: "recents" }
  | { kind: "sativa" }
  | { kind: "hybrid" }
  | { kind: "indica" }
  | { kind: "popular" }
  | { kind: "forYou" }
  | { kind: "ailment"; name: string };

export const HOME_AILMENTS = CONDITIONS;

export function sectionTitle(section: HomeSection): string {
  switch (section.kind) {
    case "recents":
      return "Recently viewed";
    case "sativa":
      return "Sativa";
    case "hybrid":
      return "Hybrid";
    case "indica":
      return "Indica";
    case "popular":
      return "Popular strains";
    case "forYou":
      return "Top picks for your symptoms";
    case "ailment":
      return section.name;
  }
}

export function sectionHref(section: HomeSection): string {
  if (section.kind === "ailment") {
    return `/browse/ailment/${slugify(section.name)}`;
  }
  if (section.kind === "forYou") {
    return "/browse/for-you";
  }
  return `/browse/${section.kind}`;
}

export function parseBrowseParams(
  section: string | undefined,
  ailmentSlug?: string,
): HomeSection | null {
  if (section === "ailment") {
    const name = HOME_AILMENTS.find((item) => slugify(item) === ailmentSlug);
    return name ? { kind: "ailment", name } : null;
  }
  if (
    section === "recents" ||
    section === "sativa" ||
    section === "hybrid" ||
    section === "indica" ||
    section === "popular" ||
    section === "for-you" ||
    section === "forYou"
  ) {
    return { kind: section === "for-you" ? "forYou" : section };
  }
  return null;
}

export function strainsFor(
  section: HomeSection,
  popular: StrainProfile[],
  recents: StrainProfile[],
  ailments: string[] = [],
): StrainProfile[] {
  const list = (() => {
    switch (section.kind) {
      case "recents":
        return recents;
      case "sativa":
        return mergeCatalog(popular, "sativa");
      case "hybrid":
        return mergeCatalog(popular, "hybrid");
      case "indica":
        return mergeCatalog(popular, "indica");
      case "ailment":
        return matchingAilment(section.name, popular);
      case "popular":
        return mergeCatalog(popular);
      case "forYou":
        // Mirrors iOS HomeSection.forYou: rank strains against the patient's
        // saved ailments and return the strongest matches first. Empty
        // ailments means "no personalization yet" — callers should fall back
        // to Popular rather than render the rail.
        return matchAilments(ailments, popular);
    }
  })();
  return applyCatalogPhotos(list);
}

export function previewFor(
  section: HomeSection,
  popular: StrainProfile[],
  recents: StrainProfile[] = [],
  ailments: string[] = [],
  limit = HOME_PREVIEW_LIMIT,
): StrainProfile[] {
  return strainsFor(section, popular, recents, ailments).slice(0, limit);
}

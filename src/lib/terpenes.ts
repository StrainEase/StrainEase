import type { StrainProfile } from "./strain-profile";

export type TerpeneProfile = {
  /** Short one-liner shown in strain cards. */
  summary: string;
  /** Two-to-three-line description shown on the terpene detail page. */
  description: string;
  /** Patient-reported characteristic tags ("earthy", "uplifting"). */
  characteristics: string[];
  /** Conditions patients often pair this terpene with. */
  benefits: string[];
};

/**
 * Curated terpene profiles. The short `summary` is what the strain page
 * already uses; the longer fields power the new terpene drill-down page.
 * Keep entries aligned with the iOS StrainMeaning.swift copy so both
 * platforms read the same thing.
 */
export const TERPENE_PROFILES: Record<string, TerpeneProfile> = {
  myrcene: {
    summary: "Earthy. Often linked with body heaviness and easier sleep.",
    description:
      "One of the most common terpenes in cannabis. Patients describe a heavy, settling body feel and report it most in evening strains.",
    characteristics: ["Earthy", "Musky", "Herbal"],
    benefits: ["Sleep", "Body relaxation", "Muscle tension"],
  },
  limonene: {
    summary: "Citrus. Commonly described as mood-lifting and daytime-friendly.",
    description:
      "Found in citrus peels. Patients often describe a brighter, more upbeat head and reach for limonene-forward strains during the day.",
    characteristics: ["Citrus", "Bright", "Sweet"],
    benefits: ["Mood", "Daytime focus", "Stress"],
  },
  caryophyllene: {
    summary: "Peppery. Patients often mention it for stress and body tension.",
    description:
      "Also found in black pepper and cloves. Patients report it pairs well with stress relief and tight muscles. It binds the CB2 receptor directly, which is unusual for a terpene.",
    characteristics: ["Peppery", "Spicy", "Warm"],
    benefits: ["Stress", "Body tension", "Inflammation"],
  },
  pinene: {
    summary: "Pine. Associated with a clearer, more alert head.",
    description:
      "Pine trees and rosemary carry it. Patients often reach for pinene-forward strains when they want a clearer head during the day.",
    characteristics: ["Pine", "Fresh", "Crisp"],
    benefits: ["Alertness", "Daytime focus", "Memory"],
  },
  linalool: {
    summary: "Floral. Frequently reported as calming.",
    description:
      "Lavender's main terpene. Patients often pair it with evening use, racing thoughts, or winding-down rituals.",
    characteristics: ["Floral", "Soft", "Sweet"],
    benefits: ["Calm", "Sleep", "Anxiety"],
  },
  terpinolene: {
    summary: "Herbal-citrus. Often a brighter, more stimulating profile.",
    description:
      "Less common but distinctive. Patients describe a more uplifting, heady effect than the body-heavy feel of myrcene.",
    characteristics: ["Herbal", "Citrus", "Piney"],
    benefits: ["Uplift", "Creativity", "Energy"],
  },
  humulene: {
    summary: "Hoppy. Sometimes noted as appetite-dampening.",
    description:
      "Same family as hops. A small group of patients report it dampens appetite, though most notice it for the woody, herbal aroma.",
    characteristics: ["Hoppy", "Woody", "Earthy"],
    benefits: ["Appetite regulation", "Body relaxation"],
  },
  ocimene: {
    summary: "Sweet-herbal. Usually described as uplifting.",
    description:
      "Found in mint, basil, and mango. Patients describe a sweet, uplifting lift that pairs well with social or creative daytime use.",
    characteristics: ["Sweet", "Herbal", "Woody"],
    benefits: ["Uplift", "Mood", "Energy"],
  },
};

export function terpeneProfile(name: string): TerpeneProfile | undefined {
  return TERPENE_PROFILES[name.trim().toLowerCase()];
}

/** Slug for routing. Mirrors strain slug rules so the URLs match. */
export function terpeneSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Resolve a slug back to the canonical terpene key. */
export function terpeneFromSlug(slug: string): string | undefined {
  const normalized = slug.trim().toLowerCase();
  for (const key of Object.keys(TERPENE_PROFILES)) {
    if (terpeneSlug(key) === normalized) return key;
  }
  return undefined;
}

/**
 * Filter a strain list to those that include the given terpene (case
 * insensitive). Strains with a richer profile (full terpenes list)
 * take precedence over the popular-list stubs that don't carry
 * terpenes yet — we still include those, marked accordingly.
 */
export function strainsWithTerpene(
  terpene: string,
  strains: StrainProfile[],
): { withProfile: StrainProfile[]; withoutTerpene: StrainProfile[] } {
  const target = terpene.trim().toLowerCase();
  const withProfile: StrainProfile[] = [];
  const withoutTerpene: StrainProfile[] = [];
  for (const strain of strains) {
    const names = (strain.terpenes ?? []).map((t) => t.name.toLowerCase());
    if (names.includes(target)) withProfile.push(strain);
    else withoutTerpene.push(strain);
  }
  return { withProfile, withoutTerpene };
}

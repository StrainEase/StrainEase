import { slugify } from "./slug";
import type { StrainProfile, StrainType } from "./strain-profile";
import { matchesCondition } from "./strain-ui";
import { readStrainDirectoryByType } from "./strain-cache";
import { db } from "./firebase";

/** Cap used by Home rails — mirrored from `home-sections.ts` to avoid
 *  a circular import between the two files. */
const HOME_PREVIEW_LIMIT = 6;

/** Bundled Leafly / Weedmaps directory row. Mirrors the shape shipped
 *  with iOS (`ios/StrainEase/Resources/strain-directory.json`) and
 *  Android (`android/app/src/main/assets/strain-directory.json`). */
type DirectoryEntry = {
  name: string;
  type: StrainType;
  thc?: string;
  uses?: string[];
  imageUrl?: string;
};

type CatalogEntry = {
  name: string;
  type: StrainType;
  thc: string;
  uses: string[];
};

// Curated browse set so Home rails always have 6+ strains per type and
// ailment, even when the live popular list is short or missing a phenotype.
// Keep in sync with ios/StrainEase/Models/StrainCatalog.swift.
const ENTRIES: CatalogEntry[] = [
  {
    name: "Blue Dream",
    type: "hybrid",
    thc: "17–24%",
    uses: [
      "Chronic pain",
      "Depression",
      "Stress",
      "Fatigue",
      "Inflammation",
      "Arthritis",
    ],
  },
  {
    name: "Granddaddy Purple",
    type: "indica",
    thc: "17–23%",
    uses: [
      "Insomnia",
      "Chronic pain",
      "Muscle spasm",
      "Stress",
      "PTSD",
      "Anxiety",
    ],
  },
  {
    name: "Sour Diesel",
    type: "sativa",
    thc: "19–24%",
    uses: [
      "ADHD",
      "Stress",
      "Depression",
      "Chronic pain",
      "Fatigue",
      "Migraine",
    ],
  },
  {
    name: "Jack Herer",
    type: "sativa",
    thc: "18–23%",
    uses: [
      "ADHD",
      "Fatigue",
      "Depression",
      "Stress",
      "Inflammation",
      "Migraine",
    ],
  },
  {
    name: "Gelato",
    type: "hybrid",
    thc: "20–25%",
    uses: ["Stress", "Anxiety", "Depression", "PTSD", "Nausea & appetite"],
  },
  {
    name: "Northern Lights",
    type: "indica",
    thc: "16–21%",
    uses: [
      "Insomnia",
      "Chronic pain",
      "Stress",
      "Anxiety",
      "PTSD",
      "Inflammation",
    ],
  },
  {
    name: "OG Kush",
    type: "hybrid",
    thc: "19–26%",
    uses: [
      "Chronic pain",
      "Stress",
      "Nausea & appetite",
      "Migraine",
      "Arthritis",
      "Muscle spasm",
    ],
  },
  {
    name: "Green Crack",
    type: "sativa",
    thc: "15–25%",
    uses: ["ADHD", "Fatigue", "Stress", "Depression", "Migraine", "Anxiety"],
  },
  {
    name: "Bubba Kush",
    type: "indica",
    thc: "14–22%",
    uses: [
      "Insomnia",
      "Chronic pain",
      "Muscle spasm",
      "Arthritis",
      "PTSD",
      "Nausea & appetite",
    ],
  },
  {
    name: "Wedding Cake",
    type: "hybrid",
    thc: "20–25%",
    uses: ["Anxiety", "Stress", "Depression", "PTSD", "Inflammation"],
  },
  {
    name: "Durban Poison",
    type: "sativa",
    thc: "15–25%",
    uses: ["ADHD", "Fatigue", "Depression", "Stress", "Migraine"],
  },
  {
    name: "Purple Punch",
    type: "indica",
    thc: "18–20%",
    uses: ["Insomnia", "Anxiety", "Nausea & appetite", "Stress", "Arthritis"],
  },
  {
    name: "Gorilla Glue",
    type: "hybrid",
    thc: "20–28%",
    uses: ["Chronic pain", "Stress", "Insomnia", "Inflammation"],
  },
  {
    name: "Super Lemon Haze",
    type: "sativa",
    thc: "17–25%",
    uses: ["ADHD", "Fatigue", "Depression", "Stress"],
  },
  {
    name: "9 Pound Hammer",
    type: "indica",
    thc: "18–23%",
    uses: ["Insomnia", "Chronic pain", "Muscle spasm", "Arthritis"],
  },
  {
    name: "Girl Scout Cookies",
    type: "hybrid",
    thc: "17–28%",
    uses: ["Chronic pain", "Nausea & appetite", "Stress", "Anxiety"],
  },
  {
    name: "Strawberry Cough",
    type: "sativa",
    thc: "15–22%",
    uses: ["ADHD", "Fatigue", "Stress", "Anxiety"],
  },
  {
    name: "Hindu Kush",
    type: "indica",
    thc: "15–20%",
    uses: [
      "Chronic pain",
      "Insomnia",
      "Inflammation",
      "Arthritis",
      "Muscle spasm",
    ],
  },
  {
    name: "White Widow",
    type: "hybrid",
    thc: "18–25%",
    uses: ["Stress", "Depression", "Inflammation", "Migraine", "Arthritis"],
  },
  {
    name: "Pineapple Express",
    type: "hybrid",
    thc: "15–25%",
    uses: ["ADHD", "Depression", "Fatigue", "Stress"],
  },
  {
    name: "GMO Cookies",
    type: "indica",
    thc: "20–28%",
    uses: ["Insomnia", "Nausea & appetite", "Chronic pain", "Muscle spasm"],
  },
  {
    name: "Super Silver Haze",
    type: "sativa",
    thc: "16–23%",
    uses: ["ADHD", "Fatigue", "Depression", "Stress"],
  },
  {
    name: "Skywalker OG",
    type: "indica",
    thc: "18–26%",
    uses: ["Insomnia", "Chronic pain", "PTSD", "Stress"],
  },
  {
    name: "Tangie",
    type: "sativa",
    thc: "17–22%",
    uses: ["ADHD", "Fatigue", "Depression", "Stress"],
  },
];

// Leafly nug shots for the curated set. Home rails use these stubs so posters
// stay filled even when the live popular list is short or missing a phenotype.
const PHOTOS: Record<string, string> = {
  "blue-dream": "https://images.leafly.com/flower-images/blue-dream.png",
  "granddaddy-purple":
    "https://images.leafly.com/flower-images/granddaddy-purple.png",
  "sour-diesel":
    "https://leafly-public.imgix.net/strains/photos/5SPDG4T4TcSO8PgLgWHO_SourDiesel_AdobeStock_171888473.jpg",
  "jack-herer": "https://images.leafly.com/flower-images/jack-herer.jpg",
  gelato: "https://images.leafly.com/flower-images/gelato.jpg",
  "northern-lights":
    "https://images.leafly.com/flower-images/northern-lights.png",
  "og-kush": "https://images.leafly.com/flower-images/og-kush.png",
  "green-crack": "https://images.leafly.com/flower-images/green-crack.png",
  "bubba-kush": "https://images.leafly.com/flower-images/bubba-kush.png",
  "wedding-cake":
    "https://leafly-public.imgix.net/strains/photos/m2y50HYRBu0dHY4JSdSx_wedding-cake_jman.jpg",
  "durban-poison": "https://images.leafly.com/flower-images/durban-poison.jpg",
  "purple-punch":
    "https://images.leafly.com/flower-images/purple-punch-fixed.jpg",
  "gorilla-glue": "https://images.leafly.com/flower-images/gg-4.jpg",
  "super-lemon-haze":
    "https://leafly-public.imgix.net/strains/photos/QRio3lTnO1PsVFx8Sxw1_super-lemon-haze_jman.jpg",
  "9-pound-hammer":
    "https://leafly-public.imgix.net/strains/photos/dN680700Rbqf10ZWl54R_9-pound-hammer_jman.jpg",
  "girl-scout-cookies": "https://images.leafly.com/flower-images/gsc.png",
  "strawberry-cough":
    "https://images.leafly.com/flower-images/strawberry-cough.png",
  "hindu-kush":
    "https://images.leafly.com/flower-images/defaults/generic/strain-13.png",
  "white-widow": "https://images.leafly.com/flower-images/white-widow.png",
  "pineapple-express":
    "https://images.leafly.com/flower-images/pineapple-express.png",
  "gmo-cookies":
    "https://images.leafly.com/flower-images/defaults/red-orange-amber/strain-2.png",
  "super-silver-haze":
    "https://images.leafly.com/flower-images/super-silver-haze.png",
  "skywalker-og":
    "https://images.leafly.com/flower-images/defaults/long-fluffy-wispy/strain-2.png",
  tangie:
    "https://leafly-public.imgix.net/strains/photos/8wTMziz0RQaJqNE4juPn_Tangie.png",
};

function toProfile(entry: CatalogEntry): StrainProfile {
  return {
    name: entry.name,
    inKnowledgeBase: true,
    type: entry.type,
    thcRange: entry.thc,
    medicalUses: entry.uses,
    imageUrl: PHOTOS[slugify(entry.name)],
  };
}

export const CATALOG: StrainProfile[] = ENTRIES.map(toProfile);

/**
 * Bundled strain directory (Leafly + Weedmaps dump). Mirrors the
 * iOS and Android apps so the home "see more" rails show every
 * strain of that type, not just the 24 curated entries.
 *
 * Loaded lazily off `/strain-directory.json` on first access and
 * merged into `CATALOG` whenever `mergeCatalog` /
 * `matchingAilment` / `matchAilments` runs. The fetch starts
 * as soon as this module is imported so the directory is usually
 * ready by the time the user clicks "see more" on a home rail.
 */
let directoryProfiles: StrainProfile[] = [];
const directoryReady: Promise<void> = (async () => {
  try {
    const res = await fetch("/strain-directory.json");
    if (!res.ok) return;
    const entries = (await res.json()) as DirectoryEntry[];
    directoryProfiles = entries.map(toDirectoryProfile);
  } catch {
    // No-op: directory stays empty, callers fall back to curated.
  }
})();

/** Convert a directory row into the shared StrainProfile shape so it
 *  composes cleanly with `mergeCatalog` / `matchingAilment`. The
 *  fields Leafly omits (cbd, lineage, effects, etc.) are left
 *  undefined — the strain page fills them on demand. */
function toDirectoryProfile(entry: DirectoryEntry): StrainProfile {
  return {
    name: entry.name,
    inKnowledgeBase: true,
    type: entry.type,
    thcRange: entry.thc,
    imageUrl: entry.imageUrl,
    medicalUses: entry.uses,
  };
}

/** Snapshot of the currently loaded bundled directory. Empty until
 *  the module-level fetch resolves. Read-only for callers. */
export function getStrainDirectory(): readonly StrainProfile[] {
  return directoryProfiles;
}

/** Resolves once both the bundled directory and the Firestore per-type
 *  cache have finished loading (or failed). Awaiting this on the Browse
 *  page guarantees the rail shows the largest available snapshot of
 *  the selected type on first render — Firestore (~3,500 strains per
 *  type) when available, bundled JSON (~150 entries) as the cold-start
 *  fallback. */
export function strainDirectoryReady(): Promise<void> {
  return Promise.all([directoryReady, directoryByTypeReady]).then(() => undefined);
}

/* ── Per-type strain directory cache (Firestore) ──────────────────────
 *
 * The daily `warmStrainDirectory` Cloud Function writes three documents
 * (`strainDirectory/byType/{indica,sativa,hybrid}/current`) holding the
 * full Leafly partition by type. Browsing on web/iOS/Android reads those
 * documents directly and uses them in `mergeCatalog` instead of the
 * bundled JSON snapshot.
 *
 * The bundled JSON stays as the cold-start fallback. If the Firestore
 * fetch fails (offline, permissions, etc.) we fall through to the JSON
 * and the Browse rail still renders — just with the smaller snapshot. */

const TYPE_BUCKETS: readonly StrainType[] = ["indica", "sativa", "hybrid"];

/** Per-type directory profiles loaded from Firestore. Empty until the
 *  module-level fetch resolves (or fails — empty bucket = use bundled). */
const directoryByType: Record<StrainType, readonly StrainProfile[]> = {
  indica: [],
  sativa: [],
  hybrid: [],
};
let directoryByTypeLoaded = false;

const directoryByTypeReady: Promise<void> = (async () => {
  try {
    if (!db) return; // No Firestore SDK configured — keep bundled fallback.
    const results = await Promise.all(
      TYPE_BUCKETS.map(async (type) => {
        const doc = await readStrainDirectoryByType(type);
        if (!doc) return [type, [] as StrainProfile[]] as const;
        const mapped = doc.previews
          .map(toFirestorePreviewProfile)
          .filter((profile): profile is StrainProfile => profile !== null);
        return [type, mapped] as const;
      }),
    );
    for (const [type, profiles] of results) {
      directoryByType[type] = profiles;
    }
    directoryByTypeLoaded = results.some(
      ([, profiles]) => profiles.length > 0,
    );
  } catch {
    // Firestore SDK threw at module load — fall back to bundled JSON.
    directoryByTypeLoaded = false;
  }
})();

/** Map a Firestore per-type preview into the minimal StrainProfile shape
 *  `mergeCatalog` consumes. The Cloud Function only writes previews whose
 *  `type` is one of the three tracked buckets, so the cast is safe; any
 *  unparseable row is dropped instead of leaking `undefined` into the
 *  typed `StrainType` slot. */
function toFirestorePreviewProfile(
  preview: {
    name: string;
    type?: string;
    thcRange?: string;
    imageUrl?: string;
    leaflyRating?: number;
    weedmapsRating?: number;
    effects?: StrainProfile["effects"];
    medicalUses?: StrainProfile["medicalUses"];
  },
): StrainProfile | null {
  if (
    preview.type !== "indica" &&
    preview.type !== "sativa" &&
    preview.type !== "hybrid"
  ) {
    return null;
  }
  return {
    name: preview.name,
    inKnowledgeBase: true,
    type: preview.type,
    thcRange: preview.thcRange,
    imageUrl: preview.imageUrl,
    leaflyRating: preview.leaflyRating,
    weedmapsRating: preview.weedmapsRating,
    effects: preview.effects,
    medicalUses: preview.medicalUses,
  };
}

/** Snapshot of the currently loaded Firestore per-type directory, by type.
 *  Returns an empty bucket for any type whose Firestore doc was missing. */
export function getStrainDirectoryByType(
  type: StrainType,
): readonly StrainProfile[] {
  return directoryByType[type];
}

/** Whether the Firestore per-type cache has finished loading (or failed).
 *  Callers can ignore the boolean and rely on `directoryByType` returning
 *  either the Firestore data or an empty bucket for fall-through. */
export function strainDirectoryByTypeLoaded(): boolean {
  return directoryByTypeLoaded;
}

/* ── Test-only state injection ──────────────────────────────────────── */

/**
 * Replace the in-memory Firestore per-type cache so tests can pin the
 * merge logic without spinning up Firestore. The bundled JSON path stays
 * the fallback when `loaded = false` or the bucket for the requested type
 * is empty. Mirrors the `_resetCatalogForTests` pattern in
 * `canonical-strain-name.test.ts`.
 */
export function _setStrainDirectoryByTypeForTests(
  loaded: boolean,
  buckets: Partial<Record<StrainType, readonly StrainProfile[]>> = {},
): void {
  directoryByTypeLoaded = loaded;
  for (const type of TYPE_BUCKETS) {
    directoryByType[type] = buckets[type] ?? [];
  }
}

/** Six strains pinned to the homescreen rail. Pulled from `CATALOG` so the
 *  photos, types, THC ranges, and medical uses stay in sync with the curated
 *  set. Picking by name (not index) keeps the list stable even if `CATALOG`
 *  is reordered. Order here is the order users see on the home page. */
const HOME_FEATURED_NAMES = [
  "Blue Dream",
  "Granddaddy Purple",
  "Sour Diesel",
  "Jack Herer",
  "Gelato",
  "Northern Lights",
] as const;

export const HOME_FEATURED_STRAINS: StrainProfile[] =
  HOME_FEATURED_NAMES.flatMap((name) =>
    CATALOG.filter((profile) => profile.name === name),
  );

// Leafly popular-list names that don't match our catalog slugs, plus a few
// current popular strains we don't keep in the browse set. Used so homepage
// cards can show medical uses instead of recreational effects.
const SLUG_ALIASES: Record<string, string> = {
  gsc: "girl-scout-cookies",
  gg4: "gorilla-glue",
  "gg-4": "gorilla-glue",
  "original-glue": "gorilla-glue",
};

const EXTRA_USES: Record<string, string[]> = {
  "lemon-cherry-gelato": ["Anxiety", "Depression", "Arthritis"],
  "super-boof": ["Anxiety", "Depression", "Fatigue"],
  "ice-cream-cake": ["Anxiety", "Insomnia", "PTSD"],
  runtz: ["Anxiety", "PTSD", "Depression"],
  "cereal-milk": ["Anxiety", "Depression", "Stress"],
  "permanent-marker": ["Anxiety", "Stress", "Depression"],
};

export function profileSlug(profile: Pick<StrainProfile, "name">): string {
  return slugify(profile.name);
}

/**
 * Direct Leafly / Weedmaps URL for a known catalog photo, or undefined
 * if the slug has no curated photo. Mirrors the iOS
 * `StrainCatalog.photoURL(for:)` and the Android equivalent — the
 * resilient image view uses this as a fallback tier when the
 * backend's Firebase Storage URL fails to load, so a dead Storage
 * URL falls back to the catalog photo instead of leaving the user
 * with a leaf placeholder.
 *
 * Accepts either a strain name (e.g. "Blue Dream") or a pre-slugified
 * key (e.g. "blue-dream"). The slug is normalized to lowercase, then
 * routed through `SLUG_ALIASES` (so callers can pass either the
 * canonical slug `"girl-scout-cookies"` or the popular alias `"gsc"`),
 * and finally looked up in `PHOTOS`.
 */
export function getPhotoURL(nameOrSlug: string): string | undefined {
  const normalized = nameOrSlug.trim().toLowerCase();
  if (!normalized) return undefined;
  // If the input looks like a name with whitespace, slugify it first so
  // callers can pass `strain.name` directly. Pre-slugified inputs go
  // through unchanged.
  const slug = normalized.includes(" ") ? slugify(normalized) : normalized;
  const key = SLUG_ALIASES[slug] ?? slug;
  return PHOTOS[key] ?? PHOTOS[slug];
}

function catalogKey(name: string): string {
  const slug = slugify(name);
  return SLUG_ALIASES[slug] ?? slug;
}

function catalogDefaults(
  name: string,
): Pick<StrainProfile, "imageUrl" | "medicalUses"> | undefined {
  const slug = slugify(name);
  const key = catalogKey(name);
  const fromCatalog = CATALOG.find((profile) => profileSlug(profile) === key);
  const medicalUses =
    fromCatalog?.medicalUses ?? EXTRA_USES[slug] ?? EXTRA_USES[key];
  const imageUrl = fromCatalog?.imageUrl ?? PHOTOS[key] ?? PHOTOS[slug];
  if (!medicalUses && !imageUrl) return undefined;
  return { imageUrl, medicalUses };
}

/** Top reported medical uses — live profile first, then catalog / extras. */
export function topMedicalUses(
  profile: Pick<StrainProfile, "name" | "medicalUses">,
  limit = 3,
): string[] {
  const live = (profile.medicalUses ?? []).filter((use) => use.trim() !== "");
  if (live.length >= limit) return live.slice(0, limit);
  const extras = catalogDefaults(profile.name)?.medicalUses ?? [];
  const seen = new Set(live.map((use) => use.toLowerCase()));
  const merged = [...live];
  for (const use of extras) {
    const key = use.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(use);
    if (merged.length >= limit) break;
  }
  return merged.slice(0, limit);
}

export function uniqueProfiles(profiles: StrainProfile[]): StrainProfile[] {
  const seen = new Map<string, StrainProfile>();
  for (const profile of profiles) {
    const slug = profileSlug(profile);
    if (!profile.name || !slug) continue;
    const existing = seen.get(slug);
    if (!existing) {
      seen.set(slug, profile);
      continue;
    }
    seen.set(slug, {
      ...existing,
      imageUrl: existing.imageUrl ?? profile.imageUrl,
      medicalUses:
        existing.medicalUses && existing.medicalUses.length > 0
          ? existing.medicalUses
          : profile.medicalUses,
    });
  }
  return [...seen.values()];
}

/** Fill catalog nug shots and medical uses. Prefer the curated photo so Home
 *  rails don't keep a live URL that 404s and falls back to the leaf. */
export function applyCatalogPhotos(profiles: StrainProfile[]): StrainProfile[] {
  return profiles.map((profile) => {
    const defaults = catalogDefaults(profile.name);
    if (!defaults) return profile;
    const imageUrl = defaults.imageUrl || profile.imageUrl;
    const medicalUses =
      profile.medicalUses && profile.medicalUses.length > 0
        ? profile.medicalUses
        : defaults.medicalUses;
    if (imageUrl === profile.imageUrl && medicalUses === profile.medicalUses) {
      return profile;
    }
    return { ...profile, imageUrl, medicalUses };
  });
}

export function mergeCatalog(
  live: StrainProfile[],
  preferringType?: StrainType,
  directory?: readonly StrainProfile[],
): StrainProfile[] {
  // Resolve the type-specific directory: Firestore per-type cache wins
  // when it has loaded; otherwise fall back to the bundled JSON, then to
  // the caller-supplied directory. This keeps the rail rendering the
  // full Leafly partition (~3,500 hybrids etc.) once Firestore returns,
  // and the bundled snapshot (~150 entries) until then.
  const directorySource = resolveDirectoryFor(
    preferringType,
    directory,
  );
  // Curated wins on photo / uses; the directory fills in the
  // long tail so type rails reach every Leafly / Weedmaps entry, not
  // just the 24 curated names.
  const source = [...CATALOG, ...directorySource];
  const extras = source.filter((catalog) => {
    if (preferringType && catalog.type !== preferringType) return false;
    return !live.some((item) => profileSlug(item) === profileSlug(catalog));
  });
  const head = preferringType
    ? live.filter((item) => item.type === preferringType)
    : live;
  return applyCatalogPhotos(uniqueProfiles([...head, ...extras]));
}

/**
 * Pick the directory profile list to merge for a given type. The
 * Firestore per-type cache (populated by the daily `warmStrainDirectory`
 * Cloud Function) wins when it has loaded with data for that type; the
 * bundled JSON is the fallback when Firestore is missing, offline, or
 * hasn't loaded yet. Callers that pass an explicit `directory` argument
 * still take precedence so unit tests can pin the input.
 */
function resolveDirectoryFor(
  preferringType: StrainType | undefined,
  directory: readonly StrainProfile[] | undefined,
): readonly StrainProfile[] {
  if (directory) return directory;
  if (preferringType && directoryByTypeLoaded) {
    const fromFirestore = directoryByType[preferringType];
    if (fromFirestore.length > 0) return fromFirestore;
  }
  // Fallback: filter the bundled JSON by type so callers that pass
  // `preferringType` still get type-specific extras even before
  // Firestore loads.
  if (preferringType) {
    return directoryProfiles.filter((profile) => profile.type === preferringType);
  }
  return directoryProfiles;
}

export function matchingAilment(
  ailment: string,
  live: StrainProfile[],
  directory: readonly StrainProfile[] = directoryProfiles,
): StrainProfile[] {
  const combined = applyCatalogPhotos(
    uniqueProfiles([...live, ...CATALOG, ...directory]),
  );
  const key = ailment.trim().toLowerCase();
  const hits = combined.filter((profile) =>
    matchesCondition(profile.medicalUses, key),
  );
  return hits.length === 0 ? combined.slice(0, 8) : hits;
}

/**
 * Score every strain against the patient's saved ailments and return
 * the strongest matches first. A strain that reports itself for
 * multiple saved ailments ranks higher than one that reports itself
 * for only one, so the patient sees the "covers the most ground"
 * picks at the top of the rail.
 *
 * Returns an empty array when no ailments are given — callers should
 * always treat the empty case as "don't personalize, fall back to
 * Popular".
 */
export function matchAilments(
  ailments: string[],
  live: StrainProfile[],
  limit = HOME_PREVIEW_LIMIT,
  directory: readonly StrainProfile[] = directoryProfiles,
): StrainProfile[] {
  const cleaned = ailments.map((a) => a.trim()).filter((a) => a !== "");
  if (cleaned.length === 0) return [];

  const combined = applyCatalogPhotos(
    uniqueProfiles([...live, ...CATALOG, ...directory]),
  );

  type Scored = { profile: StrainProfile; score: number };
  const scored: Scored[] = [];
  for (const profile of combined) {
    const uses = profile.medicalUses ?? [];
    let score = 0;
    for (const ailment of cleaned) {
      if (matchesCondition(uses, ailment)) score += 1;
    }
    if (score > 0) scored.push({ profile, score });
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Stable tie-break: alphabetical so the order doesn't shuffle on
    // every render.
    return a.profile.name.localeCompare(b.profile.name);
  });
  return scored.slice(0, limit).map((entry) => entry.profile);
}

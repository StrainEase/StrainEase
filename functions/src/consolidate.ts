// Consolidate per-source strain profiles into one Dr. Kaya-ready
// record, averaging the numeric fields (THC%, CBD%) and attaching
// source attribution so the model can see what each catalog said.
//
// Design notes
// ------------
// - The per-source caches are consulted first. Anything the scrapers
//   already wrote to sourceCache/{slug} is reused without a network
//   call. The consolidator then fires any missing sources in parallel
//   (so the first lookup of a new strain still completes in ~one
//   scrape's worth of latency), and writes the new contributions back
//   to the cache before returning.
//
// - The output is plain JSON: a StrainProfile with the standard
//   fields plus an optional `sourceAttribution` block. The block is
//   only included on fields where the sources actually disagreed or
//   where averaging produced a value distinct from the raw input —
//   this keeps Maya's prompt small (token budget) while still
//   letting her audit any number she second-guesses.
//
// - Cross-platform: the consolidator only emits string / number /
//   boolean / null / array-of-objects values. No NaN, no Infinity,
//   no Date objects, no Maps, no class instances — all of which
//   would silently corrupt the iOS Codable round-trip.

import { fetchProfile } from "./leafly";
import { fetchWeedmapsProfile } from "./weedmaps";
import { fetchAllbudProfile } from "./allbud";
import { getSourceCache, putSourceCache, type SourceId } from "./source-cache";
import { slugify } from "./leafly";
import {
  averagePercent,
  formatPercent,
  parsePercentMidpoint,
  type PercentSource,
} from "./thc-percent";
import type {
  CommunityNote,
  CommunityNoteKind,
  StrainProfile,
  StrainType,
} from "./types";

const SOURCE_ORDER: SourceId[] = ["leafly", "weedmaps", "allbud"];

/**
 * What each source said for a single numeric field. Carried into
 * Maya's prompt only when the answer came from multiple sources or
 * the averaged value differs from any single raw value.
 */
export type FieldAttribution = {
  value: string | number | null;
  sources: { source: SourceId; raw: string | number | null }[];
  averaged: boolean;
};

export type SourceAttribution = {
  thcRange?: FieldAttribution;
  cbdRange?: FieldAttribution;
  type?: FieldAttribution;
  lineage?: FieldAttribution;
  description?: FieldAttribution;
  leaflyRating?: FieldAttribution;
};

export type ConsolidatedStrain = StrainProfile & {
  /** Which sources contributed to the consolidated fields. */
  sources: SourceId[];
  /** Per-field attribution, only present when it adds signal. */
  sourceAttribution?: SourceAttribution;
};

function detectSourceKind(source: string): CommunityNoteKind {
  const s = source.toLowerCase();
  if (s.includes("leafly")) return "leafly";
  if (s.includes("weedmaps")) return "weedmaps";
  if (s.includes("allbud")) return "allbud";
  if (s.includes("reddit")) return "reddit";
  return "other";
}

/**
 * Strip a leading "THC:" or "CBD:" label that Allbud sometimes leaves
 * in the raw string. We split on ":" and take the last numeric
 * segment so the parser only ever sees digits + separators.
 */
function stripPercentLabel(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const idx = raw.search(/THC|CBD/i);
  if (idx < 0) return raw;
  return raw.slice(idx).replace(/^(THC|CBD)\s*:\s*/i, "");
}

function collectPercent(
  cache: Partial<Record<SourceId, StrainProfile | null>>,
  field: "thcRange" | "cbdRange",
): PercentSource[] {
  const out: PercentSource[] = [];
  for (const source of SOURCE_ORDER) {
    const raw = cache[source]?.[field];
    if (raw === undefined || raw === null) continue;
    const cleaned = stripPercentLabel(raw);
    out.push({
      source,
      raw,
      mid: parsePercentMidpoint(cleaned),
    });
  }
  return out;
}

function buildPercentAttribution(
  cache: Partial<Record<SourceId, StrainProfile | null>>,
  field: "thcRange" | "cbdRange",
): FieldAttribution | undefined {
  const collected = collectPercent(cache, field);
  if (collected.length === 0) return undefined;
  const averaged = averagePercent(collected);
  if (!averaged) return undefined;
  const value = formatPercent(averaged.mid);
  const distinctRaw = new Set(collected.map((c) => c.raw));
  // Only attribute when the averaged value differs from at least one
  // raw value (i.e. averaging actually changed the answer) OR when
  // the sources disagreed. Otherwise Maya's prompt can stay slim.
  const averagedSomething =
    distinctRaw.size > 1 || !distinctRaw.has(value);
  if (!averagedSomething) return undefined;
  return {
    value,
    sources: collected.map((c) => ({
      source: c.source as SourceId,
      raw: c.raw,
    })),
    averaged: true,
  };
}

function buildTypeAttribution(
  cache: Partial<Record<SourceId, StrainProfile | null>>,
): FieldAttribution | undefined {
  const sources: { source: SourceId; raw: StrainType }[] = [];
  for (const s of SOURCE_ORDER) {
    const t = cache[s]?.type;
    if (t) sources.push({ source: s, raw: t });
  }
  if (sources.length < 2) return undefined;
  const distinct = new Set(sources.map((s) => s.raw));
  if (distinct.size <= 1) return undefined;
  // Sources disagree on the species — pick the dominant one (most
  // common) and surface the conflict so Maya can decide.
  const counts = new Map<StrainType, number>();
  for (const s of sources) counts.set(s.raw, (counts.get(s.raw) ?? 0) + 1);
  const winner = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return {
    value: winner,
    sources,
    averaged: false,
  };
}

function buildLineageAttribution(
  cache: Partial<Record<SourceId, StrainProfile | null>>,
): FieldAttribution | undefined {
  const sources: { source: SourceId; raw: string }[] = [];
  for (const s of SOURCE_ORDER) {
    const l = cache[s]?.lineage;
    if (l) sources.push({ source: s, raw: l });
  }
  if (sources.length < 2) return undefined;
  // Normalize for the equality check: "Blueberry × Haze" and
  // "Blueberry x Haze" are the same lineage, just with different
  // separator characters. Collapsing the set on the normalized
  // form avoids attributing cosmetic differences as a conflict.
  const normalize = (s: string) =>
    s.trim().toLowerCase().replace(/[×x]/g, "x").replace(/\s+/g, " ");
  const distinct = new Set(sources.map((s) => normalize(s.raw)));
  if (distinct.size <= 1) return undefined;
  return { value: sources[0].raw, sources, averaged: false };
}

function buildDescriptionAttribution(
  cache: Partial<Record<SourceId, StrainProfile | null>>,
): FieldAttribution | undefined {
  const sources: { source: SourceId; raw: string }[] = [];
  for (const s of SOURCE_ORDER) {
    const d = cache[s]?.description;
    if (d) sources.push({ source: s, raw: d });
  }
  if (sources.length < 2) return undefined;
  const distinct = new Set(sources.map((s) => s.raw));
  if (distinct.size <= 1) return undefined;
  return { value: sources[0].raw, sources, averaged: false };
}

function buildRatingAttribution(
  cache: Partial<Record<SourceId, StrainProfile | null>>,
): FieldAttribution | undefined {
  // Only Leafly publishes an aggregate rating today. The other
  // sources may add one in the future — keep the wiring so the
  // attribution block is ready when they do.
  const sources: { source: SourceId; raw: number }[] = [];
  for (const s of SOURCE_ORDER) {
    const r = cache[s]?.leaflyRating;
    if (typeof r === "number" && Number.isFinite(r)) {
      sources.push({ source: s, raw: r });
    }
  }
  if (sources.length < 2) return undefined;
  const distinct = new Set(sources.map((s) => s.raw));
  if (distinct.size <= 1) return undefined;
  const avg =
    sources.reduce((a, b) => a + b.raw, 0) / sources.length;
  const value = Math.round(avg * 10) / 10;
  return {
    value,
    sources,
    averaged: true,
  };
}

function unionNotes(
  cache: Partial<Record<SourceId, StrainProfile | null>>,
): CommunityNote[] {
  const seen = new Set<string>();
  const out: CommunityNote[] = [];
  for (const s of SOURCE_ORDER) {
    const profile = cache[s];
    if (!profile?.communityNotes) continue;
    for (const note of profile.communityNotes) {
      const key = `${note.source}|${note.text.slice(0, 80)}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        source: note.source,
        text: note.text,
        kind: note.kind ?? detectSourceKind(note.source),
      });
    }
  }
  return out;
}

function effectsFrom(
  profile: StrainProfile,
): { name: string; intensity: number }[] {
  return profile.effects ?? [];
}

function unionEffects(
  cache: Partial<Record<SourceId, StrainProfile | null>>,
): StrainProfile["effects"] {
  const counts = new Map<string, number>();
  const order: string[] = [];
  for (const s of SOURCE_ORDER) {
    const profile = cache[s];
    if (!profile) continue;
    for (const e of effectsFrom(profile)) {
      const k = e.name.toLowerCase();
      if (!counts.has(k)) order.push(e.name);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  if (order.length === 0) return undefined;
  return order
    .map((name) => ({ name, intensity: counts.get(name.toLowerCase()) ?? 1 }))
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 5);
}

function unionMedicalUses(
  cache: Partial<Record<SourceId, StrainProfile | null>>,
): string[] | undefined {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of SOURCE_ORDER) {
    const profile = cache[s];
    if (!profile?.medicalUses) continue;
    for (const u of profile.medicalUses) {
      const k = u.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(u);
    }
  }
  return out.length > 0 ? out : undefined;
}

function pickFirst<T>(
  cache: Partial<Record<SourceId, StrainProfile | null>>,
  pick: (p: StrainProfile) => T | undefined,
): T | undefined {
  for (const s of SOURCE_ORDER) {
    const profile = cache[s];
    if (!profile) continue;
    const v = pick(profile);
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

/**
 * Read every available source for a strain, fetch any that aren't
 * already cached, and return the consolidated profile. Network misses
 * are written back to the per-source cache so the next call is free.
 */
export async function consolidateStrain(
  name: string,
): Promise<ConsolidatedStrain | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const slug = slugify(trimmed);
  if (!slug) return null;

  // 1. Read whatever the per-source cache already has.
  const rawCache = await getSourceCache(slug);
  // Unwrap each entry to just the profile, so the helper functions
  // don't have to know about fetchedAt.
  const profiles: Partial<Record<SourceId, StrainProfile | null>> = {};
  for (const s of SOURCE_ORDER) {
    const entry = rawCache[s];
    if (entry) profiles[s] = entry.profile;
  }

  // 2. Fire any missing source. We do these in parallel so the worst
  //    case is one scrape of latency, not three.
  const missing = SOURCE_ORDER.filter((s) => !profiles[s]);
  if (missing.length > 0) {
    const fetched = await Promise.all(
      missing.map(async (source) => {
        const profile = await fetchOne(source, trimmed);
        if (profile) {
          await putSourceCache(slug, source, profile);
          profiles[source] = profile;
        }
        return { source, profile };
      }),
    );
    for (const { source, profile } of fetched) {
      if (profile) profiles[source] = profile;
    }
  }

  // 3. Bail when nothing came back.
  const present = SOURCE_ORDER.filter((s) => profiles[s] !== undefined);
  if (present.length === 0) return null;

  // 4. Build the consolidated profile.
  const thcAttribution = buildPercentAttribution(profiles, "thcRange");
  const cbdAttribution = buildPercentAttribution(profiles, "cbdRange");
  const typeAttribution = buildTypeAttribution(profiles);
  const lineageAttribution = buildLineageAttribution(profiles);
  const descriptionAttribution = buildDescriptionAttribution(profiles);
  const ratingAttribution = buildRatingAttribution(profiles);

  const hasAttribution =
    thcAttribution ||
    cbdAttribution ||
    typeAttribution ||
    lineageAttribution ||
    descriptionAttribution ||
    ratingAttribution;

  const profile: ConsolidatedStrain = {
    name: trimmed,
    inKnowledgeBase: true,
    type: typeAttribution?.value as StrainType | undefined ??
      pickFirst(profiles, (p) => p.type),
    thcRange: thcAttribution?.value as string | undefined ??
      pickFirst(profiles, (p) => p.thcRange),
    cbdRange: cbdAttribution?.value as string | undefined ??
      pickFirst(profiles, (p) => p.cbdRange),
    lineage: lineageAttribution?.value as string | undefined ??
      pickFirst(profiles, (p) => p.lineage),
    terpenes: pickFirst(profiles, (p) => p.terpenes),
    medicalUses: unionMedicalUses(profiles),
    effects: unionEffects(profiles),
    sideEffects: pickFirst(profiles, (p) => p.sideEffects),
    description: descriptionAttribution?.value as string | undefined ??
      pickFirst(profiles, (p) => p.description),
    communityNotes: unionNotes(profiles),
    imageUrl: pickFirst(profiles, (p) => p.imageUrl),
    leaflyRating: ratingAttribution?.value as number | undefined ??
      pickFirst(profiles, (p) => p.leaflyRating),
    leaflyReviewCount: pickFirst(profiles, (p) => p.leaflyReviewCount),
    sources: present,
    sourceAttribution: hasAttribution
      ? {
          thcRange: thcAttribution,
          cbdRange: cbdAttribution,
          type: typeAttribution,
          lineage: lineageAttribution,
          description: descriptionAttribution,
          leaflyRating: ratingAttribution,
        }
      : undefined,
  };

  return profile;
}

async function fetchOne(
  source: SourceId,
  name: string,
): Promise<StrainProfile | null> {
  switch (source) {
    case "leafly":
      return await fetchProfile(name);
    case "weedmaps":
      return await fetchWeedmapsProfile(name);
    case "allbud":
      return await fetchAllbudProfile(name);
  }
}

// Consolidate per-source strain profiles (Leafly + Weedmaps + Allbud),
// attach Reddit quotes for the patient's ailments, and ask Groq to
// fill any fields still missing — the same shape the old curated
// knowledge base carried. The consolidator does the per-source
// caching, the numeric averaging, and the source attribution in
// one pass; this file adds Reddit quotes and the AI fallback on top.
import { fetchProfile } from "./leafly";
import { callGroq, extractJsonObject } from "./groq";
import { fetchRedditQuotes, fetchRedditQuotesFor } from "./reddit";
import type {
  CommunityNote,
  CommunityNoteKind,
  StrainProfile,
  StrainType,
} from "./types";
import { consolidateStrain } from "./consolidate";
import { fetchWeedmapsProfile } from "./weedmaps";
import { fetchAllbudProfile } from "./allbud";

const AILMENT_ALIASES: Record<string, string[]> = {
  insomnia: ["insomnia", "sleep", "asleep", "sleeping"],
  anxiety: ["anxiety", "anxious", "panic"],
  ocd: ["ocd", "anxiety", "anxious", "obsessive"],
  adhd: ["adhd", "add", "add/adhd"],
  "chronic pain": ["chronic pain", "pain", "ache"],
  depression: ["depression", "depressed", "mood"],
  "nausea & appetite": ["nausea", "appetite", "nauseous"],
  inflammation: ["inflammation", "inflamed"],
  migraine: ["migraine", "headache"],
  "muscle spasm": ["spasm", "spasms", "cramp"],
  ptsd: ["ptsd", "flashback", "trauma"],
  fatigue: ["fatigue", "tired", "exhausted"],
  arthritis: ["arthritis", "joint"],
  stress: ["stress", "stressed"],
};

function expandAilment(condition: string): string[] {
  const key = condition.trim().toLowerCase();
  return AILMENT_ALIASES[key] ?? [key];
}

function mentionsAilment(text: string, conditions: string[]): boolean {
  if (conditions.length === 0) return false;
  const t = text.toLowerCase();
  return conditions.some((c) =>
    expandAilment(c).some((alias) => t.includes(alias)),
  );
}

/** Derive a `kind` from the human-readable `source` string. */
function kindFromSource(source: string): CommunityNoteKind {
  const s = source.toLowerCase();
  if (s.includes("leafly")) return "leafly";
  if (s.includes("weedmaps")) return "weedmaps";
  if (s.includes("allbud")) return "allbud";
  if (s.includes("reddit")) return "reddit";
  return "other";
}

function reTag(notes: CommunityNote[]): CommunityNote[] {
  return notes.map((n) =>
    n.kind ? n : { ...n, kind: kindFromSource(n.source) },
  );
}

function uniqueNotes(notes: CommunityNote[]): CommunityNote[] {
  const seen = new Set<string>();
  const out: CommunityNote[] = [];
  for (const note of notes) {
    const key = `${note.source}|${note.text.slice(0, 80)}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(note);
  }
  return out;
}

function preferAilmentNotes(
  notes: CommunityNote[],
  conditions: string[],
): CommunityNote[] {
  if (notes.length === 0) return notes;

  // Target at least 8 community notes total, preferring a balance of
  // cannabis-site (Leafly / Weedmaps) and Reddit sources (min ~4 each
  // when available). Ailment-matched notes still rank first. Non-helpful
  // / hype reviews are already filtered upstream in leafly.ts + reddit.ts.
  const TARGET = 8;
  const MIN_PER_PLATFORM = 4;

  const kindOf = (n: CommunityNote) => n.kind ?? kindFromSource(n.source);
  const isSite = (n: CommunityNote) => {
    const k = kindOf(n);
    return k === "leafly" || k === "weedmaps";
  };
  const isReddit = (n: CommunityNote) => kindOf(n) === "reddit";

  const matched =
    conditions.length > 0
      ? notes.filter((n) => mentionsAilment(n.text, conditions))
      : [];
  const rest =
    conditions.length > 0
      ? notes.filter((n) => !mentionsAilment(n.text, conditions))
      : notes;

  // Prefer ailment matches, then fill from the rest while balancing platforms.
  const ordered = [...matched, ...rest];
  const sitePool = ordered.filter(isSite);
  const redditPool = ordered.filter(isReddit);
  const otherPool = ordered.filter((n) => !isSite(n) && !isReddit(n));

  const picked: CommunityNote[] = [];
  const seen = new Set<string>();
  const add = (n: CommunityNote) => {
    const key = `${n.source}|${n.text.slice(0, 80)}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    picked.push(n);
    return true;
  };

  // First pass: take up to MIN_PER_PLATFORM from each platform (ailment-first order).
  let siteTaken = 0;
  let redditTaken = 0;
  for (const n of sitePool) {
    if (siteTaken >= MIN_PER_PLATFORM) break;
    if (add(n)) siteTaken++;
  }
  for (const n of redditPool) {
    if (redditTaken >= MIN_PER_PLATFORM) break;
    if (add(n)) redditTaken++;
  }

  // Second pass: fill to TARGET from remaining (sites, then reddit, then other).
  for (const pool of [sitePool, redditPool, otherPool]) {
    for (const n of pool) {
      if (picked.length >= TARGET) break;
      add(n);
    }
    if (picked.length >= TARGET) break;
  }

  // If still short (one platform had almost nothing), just take whatever is left.
  if (picked.length < TARGET) {
    for (const n of ordered) {
      if (picked.length >= TARGET) break;
      add(n);
    }
  }

  return picked;
}

function unionStrings(a?: string[], b?: string[]): string[] | undefined {
  const out: string[] = [];
  for (const list of [a, b]) {
    for (const item of list ?? []) {
      if (item && !out.some((x) => x.toLowerCase() === item.toLowerCase())) {
        out.push(item);
      }
    }
  }
  return out.length > 0 ? out : undefined;
}

export function mergeProfiles(
  name: string,
  leafly: StrainProfile | null,
  weedmaps: StrainProfile | null,
  allbud: StrainProfile | null = null,
): StrainProfile {
  if (!leafly && !weedmaps && !allbud) {
    return { name, inKnowledgeBase: false };
  }
  // Primary is the first non-null source; the rest are merged in
  // for fields the primary lacks. Leafly wins for rating fields
  // specifically, but everything else falls through the chain.
  const sources = [leafly, weedmaps, allbud].filter(
    (s): s is StrainProfile => s !== null,
  );
  const primary = sources[0]!;
  const rest = sources.slice(1);
  const fallback = <K extends keyof StrainProfile>(key: K): StrainProfile[K] | undefined => {
    if (primary[key] !== undefined && primary[key] !== null) {
      return primary[key] as StrainProfile[K];
    }
    for (const s of rest) {
      if (s[key] !== undefined && s[key] !== null) {
        return s[key] as StrainProfile[K];
      }
    }
    return undefined;
  };
  const union = <K extends "medicalUses" | "sideEffects">(key: K): string[] | undefined =>
    unionStrings(...sources.map((s) => s[key]));
  return {
    name,
    inKnowledgeBase: true,
    type: fallback("type"),
    thcRange: fallback("thcRange"),
    cbdRange: fallback("cbdRange"),
    lineage: fallback("lineage"),
    terpenes: fallback("terpenes"),
    medicalUses: union("medicalUses"),
    effects: fallback("effects"),
    sideEffects: union("sideEffects"),
    description: fallback("description"),
    flavors: fallback("flavors"),
    communityNotes: reTag(
      uniqueNotes(sources.flatMap((s) => s.communityNotes ?? [])),
    ),
    imageUrl: fallback("imageUrl"),
    leaflyRating: leafly?.leaflyRating,
    leaflyReviewCount: leafly?.leaflyReviewCount,
  };
}

function needsResearch(p: StrainProfile): boolean {
  return (
    !p.description ||
    !p.medicalUses ||
    p.medicalUses.length === 0 ||
    !p.effects ||
    p.effects.length === 0
  );
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter((s) => s !== "");
  return out.length > 0 ? out.slice(0, 4) : undefined;
}

function asEffects(
  value: unknown,
): { name: string; intensity: number }[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: { name: string; intensity: number }[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    const intensity =
      typeof rec.intensity === "number" && Number.isFinite(rec.intensity)
        ? Math.max(1, Math.min(5, Math.round(rec.intensity)))
        : 3;
    if (name) out.push({ name, intensity });
  }
  return out.length > 0 ? out.slice(0, 5) : undefined;
}

function asNotes(value: unknown): CommunityNote[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: CommunityNote[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const source = typeof rec.source === "string" ? rec.source.trim() : "";
    const text = typeof rec.text === "string" ? rec.text.trim() : "";
    if (source && text) out.push({ source, text });
  }
  return out.length > 0 ? out : undefined;
}

async function researchMissing(
  profiles: StrainProfile[],
  conditions: string[],
  apiKey: string,
): Promise<Map<string, Partial<StrainProfile>>> {
  const missing = profiles.filter(needsResearch);
  if (missing.length === 0) return new Map();

  const prompt = `You are filling gaps in cannabis strain profiles for a patient-facing medical app.
For each strain below, return a JSON object keyed by the exact strain name.
Only invent fields that are missing or empty; leave others alone.
Rules:
- communityNotes must be paraphrases of commonly reported patient comments, not fabricated first-person quotes. Prefer notes tied to the patient's conditions when those are given.
- medicalUses should be short symptom/condition names.
- effects intensity is 1-5.
- Keep descriptions under 2 sentences.

Patient conditions: ${conditions.length ? conditions.join(", ") : "(none given)"}

Strains needing research:
${JSON.stringify(
    missing.map((p) => ({
      name: p.name,
      type: p.type,
      thcRange: p.thcRange,
      cbdRange: p.cbdRange,
      lineage: p.lineage,
      medicalUses: p.medicalUses,
      effects: p.effects,
      description: p.description,
      communityNotes: p.communityNotes,
    })),
    null,
    2,
  )}

Return ONLY a JSON object of the form:
{
  "Strain Name": {
    "description": "string",
    "medicalUses": ["string"],
    "effects": [{"name":"string","intensity":3}],
    "communityNotes": [{"source":"string","text":"string"}],
    "lineage": "string",
    "thcRange": "string",
    "cbdRange": "string"
  }
}`;

  const raw = await callGroq(apiKey, [{ role: "user", content: prompt }]);
  const obj = extractJsonObject(raw);
  const map = new Map<string, Partial<StrainProfile>>();
  if (!obj || typeof obj !== "object") return map;

  for (const [name, value] of Object.entries(obj)) {
    if (!value || typeof value !== "object") continue;
    const r = value as Record<string, unknown>;
    map.set(name.toLowerCase(), {
      description: typeof r.description === "string" ? r.description : undefined,
      medicalUses: asStringArray(r.medicalUses),
      effects: asEffects(r.effects),
      communityNotes: asNotes(r.communityNotes),
      lineage: typeof r.lineage === "string" ? r.lineage : undefined,
      thcRange: typeof r.thcRange === "string" ? r.thcRange : undefined,
      cbdRange: typeof r.cbdRange === "string" ? r.cbdRange : undefined,
    });
  }
  return map;
}

function applyResearch(
  base: StrainProfile,
  researched?: Partial<StrainProfile>,
): StrainProfile {
  if (!researched) return base;
  return {
    ...base,
    description: base.description ?? researched.description,
    medicalUses: base.medicalUses ?? researched.medicalUses,
    effects: base.effects ?? researched.effects,
    lineage: base.lineage ?? researched.lineage,
    thcRange: base.thcRange ?? researched.thcRange,
    cbdRange: base.cbdRange ?? researched.cbdRange,
    communityNotes: reTag(
      uniqueNotes([
        ...(base.communityNotes ?? []),
        ...(researched.communityNotes ?? []),
      ]),
    ),
    leaflyRating: base.leaflyRating,
    leaflyReviewCount: base.leaflyReviewCount,
  };
}

export async function enrichProfiles(
  names: string[],
  conditions: string[] = [],
  apiKey?: string,
): Promise<StrainProfile[]> {
  const unique = [
    ...new Set(names.map((n) => n.trim()).filter((n) => n !== "")),
  ];
  if (unique.length === 0) return [];

  // Consolidate in parallel: each call hits the per-source cache
  // first, fires any missing source's scraper, and writes the
  // results back. Hard numbers (THC/CBD/ratings) are averaged
  // across sources and the per-source values are attached as
  // `sourceAttribution` so Dr. Kaya can audit the merge.
  const [consolidatedList, redditMap] = await Promise.all([
    Promise.all(unique.map(consolidateStrain)),
    fetchRedditQuotesFor(unique, conditions),
  ]);

  let merged = consolidatedList
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .map((c) => c as StrainProfile);

  if (apiKey && merged.some(needsResearch)) {
    try {
      const researched = await researchMissing(merged, conditions, apiKey);
      merged = merged.map((p) =>
        applyResearch(p, researched.get(p.name.toLowerCase())),
      );
    } catch {
      // Synthesis can still run on whatever we have.
    }
  }

  return merged.map((profile, i) => {
    const reddit = redditNotesFor(redditMap, unique[i], profile.name);
    return {
      ...profile,
      communityNotes: preferAilmentNotes(
        reTag(uniqueNotes([...(profile.communityNotes ?? []), ...reddit])),
        conditions,
      ),
    };
  });
}

/** Quotes are fetched under the query name; catalogs may rename the profile. */
export function redditNotesFor(
  redditMap: Map<string, { source: string; text: string }[]>,
  queryName: string,
  profileName: string,
) {
  return (
    redditMap.get(queryName.toLowerCase()) ??
    redditMap.get(profileName.toLowerCase()) ??
    []
  );
}

/** Single-name lookup for search: per-source cache + Reddit, no AI. */
export async function lookupProfile(
  name: string,
  conditions: string[] = [],
): Promise<StrainProfile | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const focus = conditions
    .map((c) => c.trim())
    .filter((c) => c !== "")
    .slice(0, 16);
  const [consolidated, reddit] = await Promise.all([
    consolidateStrain(trimmed),
    fetchRedditQuotes(trimmed, focus),
  ]);
  if (!consolidated) return null;
  return {
    ...(consolidated as StrainProfile),
    communityNotes: preferAilmentNotes(
      reTag(uniqueNotes([...(consolidated.communityNotes ?? []), ...reddit])),
      focus,
    ),
  };
}

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
  if (conditions.length === 0 || notes.length === 0) return notes;

  // Ailment-matched first — that's the slice the patient actually cares
  // about. Anything left over fills with the rest (Leafly rating, then
  // Reddit, then other). Cap is 5 per strain to stay under the AI
  // provider's per-request token budget; the compare + recommend
  // system prompts only surface 1-3 reddit sources per strain anyway.
  const matched = notes.filter((n) => mentionsAilment(n.text, conditions));
  if (matched.length >= 5) return matched.slice(0, 5);

  const rest = notes.filter((n) => !mentionsAilment(n.text, conditions));
  const ranking = rest.filter(
    (n) => (n.kind ?? kindFromSource(n.source)) === "leafly",
  );
  const reddit = rest.filter(
    (n) => (n.kind ?? kindFromSource(n.source)) === "reddit",
  );
  const other = rest.filter((n) => {
    const k = n.kind ?? kindFromSource(n.source);
    return k !== "leafly" && k !== "reddit";
  });
  return [...matched, ...ranking, ...reddit, ...other].slice(0, 5);
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
    communityNotes: reTag(
      uniqueNotes(sources.flatMap((s) => s.communityNotes ?? [])),
    ),
    imageUrl: fallback("imageUrl"),
    leaflyRating: leafly?.leaflyRating,
    leaflyReviewCount: leafly?.leaflyReviewCount,
  };
}

function needsResearch(profile: StrainProfile): boolean {
  return (
    !profile.inKnowledgeBase ||
    (!profile.type && !profile.description && !profile.thcRange)
  );
}

function asStrainType(value: unknown): StrainType | undefined {
  return value === "indica" || value === "sativa" || value === "hybrid"
    ? value
    : undefined;
}

function asNotes(value: unknown): CommunityNote[] {
  if (!Array.isArray(value)) return [];
  const out: CommunityNote[] = [];
  for (const item of value) {
    const n = (item ?? {}) as Record<string, unknown>;
    const source = typeof n.source === "string" ? n.source.trim() : "";
    const text = typeof n.text === "string" ? n.text.trim() : "";
    if (!source || !text) continue;
    out.push({ source, text });
  }
  return out;
}

function asTerpenes(
  value: unknown,
): StrainProfile["terpenes"] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: { name: string; profile: string }[] = [];
  for (const item of value) {
    const t = (item ?? {}) as Record<string, unknown>;
    const name = typeof t.name === "string" ? t.name.trim() : "";
    if (!name) continue;
    out.push({
      name,
      profile: typeof t.profile === "string" ? t.profile.trim() : "",
    });
  }
  return out.length > 0 ? out.slice(0, 4) : undefined;
}

function asEffects(value: unknown): StrainProfile["effects"] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: { name: string; intensity: number }[] = [];
  for (const item of value) {
    const e = (item ?? {}) as Record<string, unknown>;
    const name = typeof e.name === "string" ? e.name.trim() : "";
    if (!name) continue;
    const intensity =
      typeof e.intensity === "number" && Number.isFinite(e.intensity)
        ? Math.max(1, Math.min(5, Math.round(e.intensity)))
        : 3;
    out.push({ name, intensity });
  }
  return out.length > 0 ? out.slice(0, 5) : undefined;
}

function asStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter((s) => s !== "");
  return out.length > 0 ? out : undefined;
}

const RESEARCH_SYSTEM = `You are Dr. Kaya, StrainEase's AI cannabis care assistant. Fill in a cannabis strain profile using only commonly reported public information (Leafly, Weedmaps, Reddit, dispensary menus).

Rules:
- Return ONLY a JSON object. No markdown.
- Only include fields you are reasonably confident about. Omit anything unverified.
- Never invent lab numbers. Ranges should be commonly reported figures, phrased like "17–23%" or "~20%".
- communityNotes must be paraphrases of commonly reported patient comments, not fabricated first-person quotes. Prefer notes tied to the patient's conditions when those are given.
- If a name does not appear to be a real, known strain, return { "name": "...", "unknown": true }.

JSON shape:
{
  "profiles": [
    {
      "name": "string",
      "type": "indica" | "sativa" | "hybrid",
      "thcRange": "string",
      "cbdRange": "string",
      "lineage": "string",
      "terpenes": [{"name":"string","profile":"string"}],
      "medicalUses": ["string"],
      "effects": [{"name":"string","intensity":1}],
      "sideEffects": ["string"],
      "description": "string",
      "communityNotes": [{"source":"string","text":"string"}],
      "unknown": false
    }
  ]
}`;

async function researchMissing(
  profiles: StrainProfile[],
  conditions: string[],
  apiKey: string,
): Promise<Map<string, StrainProfile>> {
  const missing = profiles.filter(needsResearch);
  const map = new Map<string, StrainProfile>();
  if (missing.length === 0) return map;

  const content = await callGroq(apiKey, [
    { role: "system", content: RESEARCH_SYSTEM },
    {
      role: "user",
      content: [
        "Research these strain names and fill the profile fields.",
        conditions.length > 0
          ? `Patient condition focus: ${conditions.join(", ")}`
          : "No condition focus.",
        "",
        JSON.stringify(
          missing.map((s) => s.name),
          null,
          2,
        ),
      ].join("\n"),
    },
  ]);

  const parsed = extractJsonObject(content) as
    | { profiles?: unknown }
    | null;
  const list = Array.isArray(parsed?.profiles) ? parsed.profiles : [];
  for (const item of list) {
    const r = (item ?? {}) as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (!name || r.unknown === true) continue;
    map.set(name.toLowerCase(), {
      name,
      inKnowledgeBase: false,
      type: asStrainType(r.type),
      thcRange: typeof r.thcRange === "string" ? r.thcRange : undefined,
      cbdRange: typeof r.cbdRange === "string" ? r.cbdRange : undefined,
      lineage: typeof r.lineage === "string" ? r.lineage : undefined,
      terpenes: asTerpenes(r.terpenes),
      medicalUses: asStringList(r.medicalUses),
      effects: asEffects(r.effects),
      sideEffects: asStringList(r.sideEffects),
      description:
        typeof r.description === "string" ? r.description : undefined,
      communityNotes: asNotes(r.communityNotes),
    });
  }
  return map;
}

function applyResearch(
  base: StrainProfile,
  researched: StrainProfile | undefined,
): StrainProfile {
  if (!researched) return base;
  return {
    name: base.name,
    inKnowledgeBase: base.inKnowledgeBase,
    type: base.type ?? researched.type,
    thcRange: base.thcRange ?? researched.thcRange,
    cbdRange: base.cbdRange ?? researched.cbdRange,
    lineage: base.lineage ?? researched.lineage,
    terpenes:
      base.terpenes && base.terpenes.length > 0
        ? base.terpenes
        : researched.terpenes,
    medicalUses: unionStrings(base.medicalUses, researched.medicalUses),
    effects:
      base.effects && base.effects.length > 0
        ? base.effects
        : researched.effects,
    sideEffects: unionStrings(base.sideEffects, researched.sideEffects),
    description: base.description ?? researched.description,
    communityNotes: reTag(
      uniqueNotes([
        ...(base.communityNotes ?? []),
        ...(researched.communityNotes ?? []),
      ]),
    ),
    imageUrl: base.imageUrl,
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

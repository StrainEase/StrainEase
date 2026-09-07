// Reference library: terpenes and cannabinoids.
//
// Two server-controlled Firestore collections back the "why might this
// work for you" content on the strain detail page. Everything here is
// hand-curated and cited — the LLM (Dr. Kaya) is instructed to look up
// records from this collection rather than invent facts about terpenes
// or cannabinoids in prose.
//
// Design notes
// ------------
// - Pure-data library, no AI in the loop. The seed JSON files in
//   `functions/src/seed/` are loaded by a one-shot admin callable
//   (`seedReferenceLibrary` in index.ts) and written into Firestore.
//   Clients read via `getReferenceLibrary`.
//
// - Evidence grades are honest. Most cannabis-phytochemistry claims
//   have "limited" or "anecdotal" evidence in the peer-reviewed
//   literature; this module does not inflate evidence grades. PR 7
//   (Why This Strain) is the place where the LLM grounds its
//   recommendations against this library.
//
// - Cross-platform: the shape is plain JSON (string / number /
//   boolean / null / array / object) so the iOS Codable decoder and
//   the Android Kotlin data classes can read the same payload.
//
// - Slug normalization matches the rest of the repo: lowercase, dashes
//   for whitespace and non-alphanumerics, no leading/trailing dashes.

/* ── Slug helper (mirrored from leafly.ts so we don't take a dep) ── */

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ── Domain types ────────────────────────────────────────────────── */

export type EvidenceGrade = "strong" | "moderate" | "limited" | "anecdotal";

export type SourceKind = "pubmed" | "review" | "nor.org" | "other";

export type Source = {
  label: string;
  url: string;
  kind: SourceKind;
};

export type TerpeneRecord = {
  slug: string;
  displayName: string;
  classDescription: string;
  aroma: string;
  commonSources: string[];
  mechanism: string;
  commonlyReportedEffects: string[];
  evidenceGrade: EvidenceGrade;
  sources: Source[];
};

export type Psychoactivity = "none" | "mild" | "moderate" | "high";

export type CannabinoidRecord = {
  slug: string;
  displayName: string;
  cb1Affinity: string;
  cb2Affinity: string;
  psychoactivity: Psychoactivity;
  mechanism: string;
  commonlyReportedEffects: string[];
  evidenceGrade: EvidenceGrade;
  sources: Source[];
};

export type ReferenceLibraryKind = "terpene" | "cannabinoid" | "interaction";
export type ReferenceRecord = TerpeneRecord | CannabinoidRecord | InteractionRecord;

/* ── Drug interaction library ─────────────────────────────────────── */

export type DrugClass =
  | "SSRI"
  | "benzodiazepine"
  | "opioid"
  | "anticoagulant"
  | "antihistamine"
  | "stimulant"
  | "other";

export type InteractionSeverity =
  | "low"
  | "moderate"
  | "high"
  | "theoretical";

export type CannabisInteraction = {
  severity: InteractionSeverity;
  mechanism: string;
  commonGuidance: string;
  discussWithPrescriber: boolean;
};

export type InteractionRecord = {
  slug: string;
  drugName: string;
  drugClass: DrugClass;
  cannabisInteraction: CannabisInteraction;
  sources: Source[];
};

/* ── Seed file types (validated at load time) ───────────────────── */

/**
 * Output shape of validateSeedFile — the fully-validated records
 * with a non-optional slug. The input JSON may omit slug and have
 * it derived from displayName; that is the only normalization.
 */
type ValidatedSeedFile =
  | { kind: "terpene"; entries: TerpeneRecord[] }
  | { kind: "cannabinoid"; entries: CannabinoidRecord[] }
  | { kind: "interaction"; entries: InteractionRecord[] };

/* ── Validation ──────────────────────────────────────────────────── */

const EVIDENCE_GRADES: ReadonlySet<EvidenceGrade> = new Set([
  "strong",
  "moderate",
  "limited",
  "anecdotal",
]);
const SOURCE_KINDS: ReadonlySet<SourceKind> = new Set([
  "pubmed",
  "review",
  "nor.org",
  "other",
]);
const PSYCHOACTIVITY_VALUES: ReadonlySet<Psychoactivity> = new Set([
  "none",
  "mild",
  "moderate",
  "high",
]);
const DRUG_CLASSES: ReadonlySet<DrugClass> = new Set([
  "SSRI",
  "benzodiazepine",
  "opioid",
  "anticoagulant",
  "antihistamine",
  "stimulant",
  "other",
]);
const INTERACTION_SEVERITIES: ReadonlySet<InteractionSeverity> = new Set([
  "low",
  "moderate",
  "high",
  "theoretical",
]);

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function validateSource(s: unknown, path: string): Source {
  if (typeof s !== "object" || s === null) {
    throw new Error(`${path}: source must be an object`);
  }
  const obj = s as Record<string, unknown>;
  if (typeof obj.label !== "string" || obj.label.trim() === "") {
    throw new Error(`${path}: source.label must be a non-empty string`);
  }
  if (typeof obj.url !== "string" || !/^https?:\/\//.test(obj.url)) {
    throw new Error(`${path}: source.url must be an http(s) URL`);
  }
  if (typeof obj.kind !== "string" || !SOURCE_KINDS.has(obj.kind as SourceKind)) {
    throw new Error(
      `${path}: source.kind must be one of pubmed|review|nor.org|other`,
    );
  }
  return {
    label: obj.label.trim().slice(0, 200),
    url: obj.url,
    kind: obj.kind as SourceKind,
  };
}

function validateCommonFields(
  raw: Record<string, unknown>,
  path: string,
): {
  displayName: string;
  mechanism: string;
  commonlyReportedEffects: string[];
  evidenceGrade: EvidenceGrade;
  sources: Source[];
} {
  if (typeof raw.displayName !== "string" || raw.displayName.trim() === "") {
    throw new Error(`${path}.displayName must be a non-empty string`);
  }
  if (typeof raw.mechanism !== "string" || raw.mechanism.trim() === "") {
    throw new Error(`${path}.mechanism must be a non-empty string`);
  }
  if (raw.mechanism.length > 1000) {
    throw new Error(`${path}.mechanism must be <= 1000 characters`);
  }
  if (!isStringArray(raw.commonlyReportedEffects)) {
    throw new Error(`${path}.commonlyReportedEffects must be a string[]`);
  }
  if (
    typeof raw.evidenceGrade !== "string" ||
    !EVIDENCE_GRADES.has(raw.evidenceGrade as EvidenceGrade)
  ) {
    throw new Error(
      `${path}.evidenceGrade must be strong|moderate|limited|anecdotal`,
    );
  }
  if (!Array.isArray(raw.sources) || raw.sources.length === 0) {
    throw new Error(`${path}.sources must be a non-empty array`);
  }
  const sources = raw.sources.map((s, i) => validateSource(s, `${path}.sources[${i}]`));
  return {
    displayName: raw.displayName.trim().slice(0, 120),
    mechanism: raw.mechanism.trim(),
    commonlyReportedEffects: (raw.commonlyReportedEffects as string[])
      .map((e) => e.trim())
      .filter((e) => e.length > 0)
      .slice(0, 12),
    evidenceGrade: raw.evidenceGrade as EvidenceGrade,
    sources,
  };
}

function validateTerpene(raw: unknown, index: number): TerpeneRecord {
  const path = `terpeneLibrary[${index}]`;
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`${path}: must be an object`);
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.classDescription !== "string" || obj.classDescription.trim() === "") {
    throw new Error(`${path}.classDescription must be a non-empty string`);
  }
  if (typeof obj.aroma !== "string" || obj.aroma.trim() === "") {
    throw new Error(`${path}.aroma must be a non-empty string`);
  }
  if (!isStringArray(obj.commonSources)) {
    throw new Error(`${path}.commonSources must be a string[]`);
  }
  const common = validateCommonFields(obj, path);
  const slug =
    typeof obj.slug === "string" && obj.slug.trim() !== ""
      ? slugify(obj.slug)
      : slugify(obj.displayName as string);
  if (slug === "") {
    throw new Error(`${path}.slug could not be derived`);
  }
  return {
    slug,
    displayName: common.displayName,
    classDescription: obj.classDescription.trim().slice(0, 240),
    aroma: obj.aroma.trim().slice(0, 200),
    commonSources: (obj.commonSources as string[])
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 12),
    mechanism: common.mechanism,
    commonlyReportedEffects: common.commonlyReportedEffects,
    evidenceGrade: common.evidenceGrade,
    sources: common.sources,
  };
}

function validateCannabinoid(raw: unknown, index: number): CannabinoidRecord {
  const path = `cannabinoidLibrary[${index}]`;
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`${path}: must be an object`);
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.cb1Affinity !== "string" || obj.cb1Affinity.trim() === "") {
    throw new Error(`${path}.cb1Affinity must be a non-empty string`);
  }
  if (typeof obj.cb2Affinity !== "string" || obj.cb2Affinity.trim() === "") {
    throw new Error(`${path}.cb2Affinity must be a non-empty string`);
  }
  if (
    typeof obj.psychoactivity !== "string" ||
    !PSYCHOACTIVITY_VALUES.has(obj.psychoactivity as Psychoactivity)
  ) {
    throw new Error(
      `${path}.psychoactivity must be none|mild|moderate|high`,
    );
  }
  const common = validateCommonFields(obj, path);
  const slug =
    typeof obj.slug === "string" && obj.slug.trim() !== ""
      ? slugify(obj.slug)
      : slugify(obj.displayName as string);
  if (slug === "") {
    throw new Error(`${path}.slug could not be derived`);
  }
  return {
    slug,
    displayName: common.displayName,
    cb1Affinity: obj.cb1Affinity.trim().slice(0, 240),
    cb2Affinity: obj.cb2Affinity.trim().slice(0, 240),
    psychoactivity: obj.psychoactivity as Psychoactivity,
    mechanism: common.mechanism,
    commonlyReportedEffects: common.commonlyReportedEffects,
    evidenceGrade: common.evidenceGrade,
    sources: common.sources,
  };
}

/**
 * Validate a parsed seed file. Throws on any shape error. Returns the
 * validated records keyed by slug. Slug collisions are a hard error
 * (the loader is meant to be re-run idempotently; the seed is the
 * single source of truth for what slugs exist).
 */
export function validateSeedFile(parsed: unknown): ValidatedSeedFile {
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("seed file: must be a JSON object");
  }
  const obj = parsed as Record<string, unknown>;
  if (
    obj.kind !== "terpene" &&
    obj.kind !== "cannabinoid" &&
    obj.kind !== "interaction"
  ) {
    throw new Error(
      'seed file: kind must be "terpene", "cannabinoid", or "interaction"',
    );
  }
  if (!Array.isArray(obj.entries)) {
    throw new Error("seed file: entries must be an array");
  }
  if (obj.kind === "terpene") {
    const records = (obj.entries as unknown[]).map((e, i) => validateTerpene(e, i));
    const slugs = new Set<string>();
    for (const r of records) {
      if (slugs.has(r.slug)) {
        throw new Error(`terpeneLibrary: duplicate slug "${r.slug}"`);
      }
      slugs.add(r.slug);
    }
    return { kind: "terpene", entries: records };
  }
  if (obj.kind === "cannabinoid") {
    const records = (obj.entries as unknown[]).map((e, i) =>
      validateCannabinoid(e, i),
    );
    const slugs = new Set<string>();
    for (const r of records) {
      if (slugs.has(r.slug)) {
        throw new Error(`cannabinoidLibrary: duplicate slug "${r.slug}"`);
      }
      slugs.add(r.slug);
    }
    return { kind: "cannabinoid", entries: records };
  }
  // kind === "interaction"
  const records = (obj.entries as unknown[]).map((e, i) =>
    validateInteraction(e, i),
  );
  const slugs = new Set<string>();
  for (const r of records) {
    if (slugs.has(r.slug)) {
      throw new Error(`interactionLibrary: duplicate slug "${r.slug}"`);
    }
    slugs.add(r.slug);
  }
  return { kind: "interaction", entries: records };
}

/* ── Interaction validation ─────────────────────────────────────── */

function validateCannabisInteraction(
  raw: Record<string, unknown>,
  path: string,
): CannabisInteraction {
  if (
    typeof raw.severity !== "string" ||
    !INTERACTION_SEVERITIES.has(raw.severity as InteractionSeverity)
  ) {
    throw new Error(
      `${path}.severity must be low|moderate|high|theoretical`,
    );
  }
  if (typeof raw.mechanism !== "string" || raw.mechanism.trim() === "") {
    throw new Error(`${path}.mechanism must be a non-empty string`);
  }
  if (raw.mechanism.length > 1000) {
    throw new Error(`${path}.mechanism must be <= 1000 characters`);
  }
  if (
    typeof raw.commonGuidance !== "string" ||
    raw.commonGuidance.trim() === ""
  ) {
    throw new Error(`${path}.commonGuidance must be a non-empty string`);
  }
  if (raw.commonGuidance.length > 1000) {
    throw new Error(`${path}.commonGuidance must be <= 1000 characters`);
  }
  // discussWithPrescriber must be present and true — every record
  // must say "discuss with your prescriber". The schema rejects false
  // so a future seed edit can't quietly drop the guardrail.
  if (typeof raw.discussWithPrescriber !== "boolean") {
    throw new Error(
      `${path}.discussWithPrescriber must be a boolean`,
    );
  }
  if (raw.discussWithPrescriber !== true) {
    throw new Error(
      `${path}.discussWithPrescriber must be true — this library is a literature pointer, not medical advice`,
    );
  }
  return {
    severity: raw.severity as InteractionSeverity,
    mechanism: raw.mechanism.trim(),
    commonGuidance: raw.commonGuidance.trim(),
    discussWithPrescriber: true,
  };
}

function validateInteraction(raw: unknown, index: number): InteractionRecord {
  const path = `interactionLibrary[${index}]`;
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`${path}: must be an object`);
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.drugName !== "string" || obj.drugName.trim() === "") {
    throw new Error(`${path}.drugName must be a non-empty string`);
  }
  if (
    typeof obj.drugClass !== "string" ||
    !DRUG_CLASSES.has(obj.drugClass as DrugClass)
  ) {
    throw new Error(
      `${path}.drugClass must be SSRI|benzodiazepine|opioid|anticoagulant|antihistamine|stimulant|other`,
    );
  }
  if (
    typeof obj.cannabisInteraction !== "object" ||
    obj.cannabisInteraction === null
  ) {
    throw new Error(`${path}.cannabisInteraction must be an object`);
  }
  const interaction = validateCannabisInteraction(
    obj.cannabisInteraction as Record<string, unknown>,
    `${path}.cannabisInteraction`,
  );
  if (!Array.isArray(obj.sources) || obj.sources.length === 0) {
    throw new Error(`${path}.sources must be a non-empty array`);
  }
  const sources = (obj.sources as unknown[]).map((s, i) =>
    validateSource(s, `${path}.sources[${i}]`),
  );
  const slug =
    typeof obj.slug === "string" && obj.slug.trim() !== ""
      ? slugify(obj.slug)
      : slugify(obj.drugName as string);
  if (slug === "") {
    throw new Error(`${path}.slug could not be derived`);
  }
  return {
    slug,
    drugName: (obj.drugName as string).trim().slice(0, 120),
    drugClass: obj.drugClass as DrugClass,
    cannabisInteraction: interaction,
    sources,
  };
}

/* ── Lookup helpers (used by the callable) ──────────────────────── */

/**
 * Resolve a record by slug from a flat list. Returns null when the
 * record is missing. The list is whatever the caller has — typically
 * the result of reading a Firestore collection and mapping docs to
 * records. We keep this as a pure function (no Firestore SDK in this
 * module) so it is trivial to unit-test.
 */
export function findBySlug<T extends { slug: string }>(
  records: T[],
  slug: string,
): T | null {
  const target = slugify(slug);
  if (target === "") return null;
  return records.find((r) => r.slug === target) ?? null;
}

/**
 * Look up interaction records for a list of drug names. Returns the
 * records whose slug matches any of the input names (after slug
 * normalization). Unknown drug names are silently dropped — the
 * caller gets an empty array for a completely unknown list, never an
 * error. Duplicate input names that resolve to the same slug are
 * deduped: each matching record is returned at most once.
 *
 * Pure function (no Firestore SDK in this module) so it is trivial
 * to unit-test against a fixture list.
 */
export function lookupInteractions(
  records: InteractionRecord[],
  drugs: string[],
): InteractionRecord[] {
  const targets = new Set<string>();
  for (const d of drugs) {
    const s = slugify(d);
    if (s !== "") targets.add(s);
  }
  if (targets.size === 0) return [];
  const out: InteractionRecord[] = [];
  const seen = new Set<string>();
  for (const r of records) {
    if (targets.has(r.slug) && !seen.has(r.slug)) {
      seen.add(r.slug);
      out.push(r);
    }
  }
  return out;
}

/**
 * Re-export the slug helper so the callable and tests can use the
 * same normalization rules.
 */
export { slugify as referenceSlugify };

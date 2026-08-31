// Types shared between the callable functions and the client SDK.
// Mirrored from src/lib/strain-profile.ts / src/lib/strain-api.ts so the
// functions project stays self-contained.

export type StrainType = "indica" | "sativa" | "hybrid";

// Source note origin. Lets the UI distinguish Leafly/Weedmaps/Allbud/RD
// threads without re-parsing the human-readable `source` string. New
// values are additive — older clients ignore unknown `kind`s.
export type CommunityNoteKind =
  | "leafly"
  | "weedmaps"
  | "allbud"
  | "reddit"
  | "other";

export type CommunityNote = {
  source: string;
  text: string;
  kind?: CommunityNoteKind;
};

// A Reddit thread the LLM surfaced from its training knowledge. We never
// live-scrape Reddit — these are pointers to commonly-discussed threads
// the model is confident really exist. URLs are pinned to old.reddit.com
// so they open without the heavy client.
export type RedditSource = {
  url: string;
  subreddit: string;
  title: string;
  snippet?: string;
  score?: number;
};

export type StrainProfile = {
  name: string;
  inKnowledgeBase: boolean;
  type?: StrainType;
  thcRange?: string;
  cbdRange?: string;
  lineage?: string;
  terpenes?: { name: string; profile: string }[];
  medicalUses?: string[];
  effects?: { name: string; intensity: number }[];
  flavors?: string[];
  sideEffects?: string[];
  description?: string;
  communityNotes?: CommunityNote[];
  // Reddit threads surfaced by the LLM. Tagged separately from the note
  // stream so the UI can render them as outbound links.
  redditSources?: RedditSource[];
  /** HTTPS photo from Leafly (`nugImage`) or Weedmaps when available. */
  imageUrl?: string;
  /** Leafly aggregate rating (0–5). Not a patient quote. */
  leaflyRating?: number;
  /** Leafly published review count for the star rating. */
  leaflyReviewCount?: number;
  /** Weedmaps aggregate rating (0–5). Not a patient quote. */
  weedmapsRating?: number;
  /** Weedmaps published review count for the star rating. */
  weedmapsReviewCount?: number;
  /** Allbud aggregate rating (0–5). Not a patient quote. */
  allbudRating?: number;
  /** Allbud published review count for the star rating. */
  allbudReviewCount?: number;
  /**
   * Sources that contributed to the consolidated fields. Populated
   * only when the consolidator ran (i.e. when at least one source
   * returned a profile). Cross-platform safe — the iOS Codable
   * decoder ignores unknown fields, so older clients still parse.
   */
  sources?: ("leafly" | "weedmaps" | "allbud")[];
  /**
   * Per-field attribution for the consolidated values. Carries the
   * raw input from each source when averaging or selection produced
   * a value distinct from any single raw value, so Dr. Kaya can
   * audit the merge. Omitted when every field was unambiguous.
   */
  sourceAttribution?: SourceAttribution;
};

/**
 * One field's worth of per-source attribution. `value` is the
 * consolidated value Kaya sees. `sources` lists what each catalog
 * actually said, in the order Leafly → Weedmaps → Allbud. `averaged`
 * is true when the consolidated value was computed (e.g. averaged
 * across ranges) rather than copied verbatim from one source.
 */
export type SourceAttribution = {
  thcRange?: FieldAttribution;
  cbdRange?: FieldAttribution;
  type?: FieldAttribution;
  lineage?: FieldAttribution;
  description?: FieldAttribution;
  leaflyRating?: FieldAttribution;
};

export type FieldAttribution = {
  value: string | number | null;
  sources: {
    source: "leafly" | "weedmaps" | "allbud";
    raw: string | number | null;
  }[];
  averaged: boolean;
};

export type StrainAnalysis = {
  headline: string;
  summary: string;
  forCondition: {
    best: string;
    why: string;
    runnerUp: string;
  } | null;
  keyDifferences: string[];
  commonGround: string[];
  cautions: string[];
  // Reddit threads surfaced for the comparison, deduped across strains.
  // Sources come from the LLM's training knowledge, not a live scrape.
  redditSources?: RedditSource[];
};

export type StrainComparison = {
  strains: StrainProfile[];
  analysis: StrainAnalysis;
};

export type StrainRecommendation = {
  strainName: string;
  reason: string;
  bestFor: string;
  caution: string;
};

export type RecommendationResult = {
  headline: string;
  summary: string;
  recommendations: StrainRecommendation[];
  strains: StrainProfile[];
  redditSources?: RedditSource[];
};

// Types shared between the callable functions and the client SDK.
// Mirrored from src/lib/strain-profile.ts / src/lib/strain-api.ts so the
// functions project stays self-contained.

export type StrainType = "indica" | "sativa" | "hybrid";

// Source note origin. Lets the UI distinguish Leafly/Weedmaps/RD threads
// without re-parsing the human-readable `source` string. New values are
// additive — older clients ignore unknown `kind`s.
export type CommunityNoteKind = "leafly" | "weedmaps" | "reddit" | "other";

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
  sideEffects?: string[];
  description?: string;
  communityNotes?: CommunityNote[];
  // Reddit threads surfaced by the LLM. Tagged separately from the note
  // stream so the UI can render them as outbound links.
  redditSources?: RedditSource[];
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

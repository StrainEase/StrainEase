// Types shared between the callable functions and the client SDK.
// Mirrored from src/lib/strain-profile.ts / src/lib/strain-api.ts so the
// functions project stays self-contained.

export type StrainType = "indica" | "sativa" | "hybrid";

export type CommunityNote = {
  source: string;
  text: string;
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
};

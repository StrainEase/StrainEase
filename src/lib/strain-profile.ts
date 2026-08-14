// Shared type for a strain in a comparison. Used by both the Convex compare
// action (server) and the comparison UI (client). Strains found in the
// curated knowledge base carry full profile data; anything else is marked
// inKnowledgeBase: false and the AI researches it from public sources.
export type StrainType = "indica" | "sativa" | "hybrid";

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
  communityNotes?: { source: string; text: string }[];
};

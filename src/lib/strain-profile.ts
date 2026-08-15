// Shared type for a strain in a comparison. Used by the Firebase compare
// callable and the comparison UI. Profiles found on Leafly or Weedmaps
// carry full field data (inKnowledgeBase: true). Anything else is marked
// inKnowledgeBase: false and MiniMax fills the same fields from public
// sources. communityNotes may include Leafly reviews, Weedmaps tags, and
// Reddit quotes for the patient's ailments.
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

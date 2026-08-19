export type QuoteNote = {
  source: string;
  text: string;
  /** Optional origin tag from the backend / featured mocks. */
  kind?: "leafly" | "weedmaps" | "reddit" | "other";
};

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

function aliasesFor(condition: string): string[] {
  const key = condition.trim().toLowerCase();
  return AILMENT_ALIASES[key] ?? [key];
}

export function mentionsAilment(text: string, conditions: string[]): boolean {
  if (conditions.length === 0) return false;
  const t = text.toLowerCase();
  return conditions.some((c) =>
    aliasesFor(c).some((alias) => t.includes(alias)),
  );
}

export function isPatientQuote(note: QuoteNote): boolean {
  const src = note.source.toLowerCase();
  return src.includes("reddit") || src.includes("review") || isRedditNote(note);
}

export type NoteChannel = "cannabis" | "reddit" | "all";
export type SentimentTone = "positive" | "mixed" | "cautious" | "insufficient";

export type ChannelSummary = {
  tone: SentimentTone;
  label: string;
  rating: { stars: number; reviewCount: number | null } | null;
  reviewCount: number;
  positiveHits: number;
  negativeHits: number;
  summary: string;
};

export function isRedditNote(note: QuoteNote): boolean {
  if (note.kind === "reddit") return true;
  if (note.kind === "leafly" || note.kind === "weedmaps") return false;
  const src = note.source.toLowerCase().trim();
  // "Reddit", "r/chronicpain", "/r/trees", old.reddit.com links, etc.
  if (src.includes("reddit")) return true;
  if (/^r\/[a-z0-9_]+/i.test(src)) return true;
  if (src.includes("/r/")) return true;
  return false;
}

export function notesForChannel(
  notes: QuoteNote[] | undefined,
  channel: NoteChannel,
): QuoteNote[] {
  const list = notes ?? [];
  if (channel === "all") return list.slice();
  return list.filter((n) =>
    channel === "reddit" ? isRedditNote(n) : !isRedditNote(n),
  );
}

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
  return src.includes("reddit") || src.includes("review");
}

export type NoteChannel = "cannabis" | "reddit" | "app" | "all";
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

/** Rating aggregates and site blurbs — not individual patient comments. */
export function isAggregateNote(note: QuoteNote): boolean {
  const src = note.source.toLowerCase();
  if (
    src === "leafly community" ||
    src === "weedmaps" ||
    src === "weedmaps listing"
  ) {
    return true;
  }
  return /^\d+(?:\.\d+)?★/.test(note.text.trim());
}

export function individualReviews(notes: QuoteNote[]): QuoteNote[] {
  return notes.filter((n) => !isAggregateNote(n));
}

export function sortNotesForConditions(
  notes: QuoteNote[],
  conditions: string[],
): QuoteNote[] {
  if (conditions.length === 0) return notes;
  const matched: QuoteNote[] = [];
  const rest: QuoteNote[] = [];
  for (const note of notes) {
    (mentionsAilment(note.text, conditions) ? matched : rest).push(note);
  }
  return [...matched, ...rest];
}

export function quotesForAilment(
  notes: QuoteNote[] | undefined,
  conditions: string[],
): QuoteNote[] {
  const list = (notes ?? []).filter(isPatientQuote);
  if (conditions.length === 0) return list;
  const matched = list.filter((n) => mentionsAilment(n.text, conditions));
  return matched.length > 0 ? matched : list;
}

export function quoteConfidence(
  notes: QuoteNote[] | undefined,
  conditions: string[],
): string | null {
  const matched = (notes ?? []).filter(
    (n) => isPatientQuote(n) && mentionsAilment(n.text, conditions),
  );
  if (conditions.length === 0) return null;
  const label = conditions[0]?.toLowerCase() ?? "this symptom";
  if (matched.length === 0) {
    return `No direct patient quotes for ${label} yet — this is commonly reported, not a lab result.`;
  }
  if (matched.length === 1) {
    return `1 patient comment mentions ${label}.`;
  }
  return `${matched.length} patient comments mention ${label}.`;
}

export function pullQuotesFromStrains(
  strains: { name: string; communityNotes?: QuoteNote[] }[],
  conditions: string[],
  limit = 2,
): { strain: string; note: QuoteNote }[] {
  const out: { strain: string; note: QuoteNote }[] = [];
  for (const strain of strains) {
    for (const note of quotesForAilment(strain.communityNotes, conditions)) {
      out.push({ strain: strain.name, note });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

const POSITIVE_PHRASES = [
  "helped",
  "help with",
  "help me",
  "relief",
  "relieved",
  "great for",
  "good for",
  "works for",
  "worked for",
  "love",
  "loved",
  "amazing",
  "awesome",
  "best",
  "recommend",
  "calming",
  "relaxed",
  "relaxing",
  "sleep through",
  "knocked me",
  "eased",
  "uplifting",
  "favorite",
  "go-to",
  "go to",
  "perfect",
  "effective",
  "saved me",
  "no anxiety",
  "melted",
];

const NEGATIVE_PHRASES = [
  "paranoid",
  "paranoia",
  "gave me anxiety",
  "made me anxious",
  "too racy",
  "racing heart",
  "racing thoughts",
  "too strong",
  "too much",
  "headache",
  "harsh",
  "didn't work",
  "did not work",
  "didn't help",
  "did not help",
  "waste",
  "overwhelming",
  "uncomfortable",
  "panic",
  "dizzy",
  "nauseous",
  "couch lock",
  "couch-lock",
];

const MILD_CAVEATS: { phrase: string; label: string }[] = [
  { phrase: "dry mouth", label: "dry mouth" },
  { phrase: "cottonmouth", label: "dry mouth" },
  { phrase: "dry eyes", label: "dry eyes" },
  { phrase: "munchies", label: "appetite increase" },
];

const THEMES: { label: string; aliases: string[] }[] = [
  { label: "sleep", aliases: ["sleep", "insomnia", "asleep", "sleepless"] },
  { label: "pain", aliases: ["pain", "ache", "aching"] },
  { label: "anxiety", aliases: ["anxiety", "anxious", "panic", "worry", "ocd"] },
  { label: "stress", aliases: ["stress", "stressed"] },
  { label: "mood", aliases: ["depression", "depressed", "mood"] },
  { label: "appetite", aliases: ["appetite", "hungry", "nausea"] },
  { label: "energy or focus", aliases: ["energy", "focus", "productive", "creative"] },
  { label: "body relaxation", aliases: ["relax", "body", "sedat"] },
  { label: "flavor", aliases: ["taste", "flavor", "sweet", "citrus", "berry"] },
  { label: "potency", aliases: ["strong", "potent", "intense"] },
];

const TONE_LABEL: Record<SentimentTone, string> = {
  positive: "Mostly positive",
  mixed: "Mixed",
  cautious: "More cautious",
  insufficient: "Limited signal",
};

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function countHits(text: string, phrases: string[]): number {
  return phrases.reduce((n, p) => (text.includes(p) ? n + 1 : n), 0);
}

export function parseLeaflyRating(
  notes: QuoteNote[],
  explicit?: { leaflyRating?: number; leaflyReviewCount?: number },
): { stars: number; reviewCount: number | null } | null {
  if (typeof explicit?.leaflyRating === "number") {
    return {
      stars: explicit.leaflyRating,
      reviewCount:
        typeof explicit.leaflyReviewCount === "number"
          ? explicit.leaflyReviewCount
          : null,
    };
  }
  for (const note of notes) {
    if (note.source.toLowerCase() !== "leafly community") continue;
    const stars = note.text.match(/(\d+(?:\.\d+)?)★/);
    if (!stars) continue;
    const count = note.text.match(/([\d,]+)\s+reviews/i);
    return {
      stars: Number(stars[1]),
      reviewCount: count ? Number(count[1].replace(/,/g, "")) : null,
    };
  }
  return null;
}

export function formatLeaflyRatingLine(
  rating: { stars: number; reviewCount: number | null } | null,
): string | null {
  if (!rating) return null;
  const count =
    rating.reviewCount !== null
      ? ` · ${rating.reviewCount.toLocaleString("en-US")} reviews`
      : "";
  return `${rating.stars.toFixed(1)}★${count}`;
}

function weedmapsUses(notes: QuoteNote[]): string[] {
  for (const note of notes) {
    if (note.source.toLowerCase() !== "weedmaps") continue;
    const match = note.text.match(/tag it for (.+?)\.?$/i);
    if (!match) continue;
    return match[1]
      .split(/,\s*/)
      .map((s) => s.replace(/\.$/, "").trim())
      .filter(Boolean);
  }
  return [];
}

function topThemes(texts: string[], limit = 3): string[] {
  const scored = THEMES.map((theme) => ({
    label: theme.label,
    hits: texts.reduce(
      (n, t) =>
        n + (theme.aliases.some((alias) => t.includes(alias)) ? 1 : 0),
      0,
    ),
  }))
    .filter((t) => t.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  return scored.slice(0, limit).map((t) => t.label);
}

function caveatsFrom(texts: string[]): string[] {
  const found: string[] = [];
  const blob = texts.join(" ");
  if (
    blob.includes("paranoid") ||
    blob.includes("paranoia") ||
    blob.includes("gave me anxiety") ||
    blob.includes("made me anxious")
  ) {
    found.push("anxiety or paranoia");
  }
  if (
    blob.includes("too racy") ||
    blob.includes("racing heart") ||
    blob.includes("racing thoughts")
  ) {
    found.push("raciness");
  }
  if (blob.includes("too strong") || blob.includes("overwhelming")) {
    found.push("feeling too strong");
  }
  if (blob.includes("headache")) found.push("headache");
  for (const { phrase, label } of MILD_CAVEATS) {
    if (blob.includes(phrase) && !found.includes(label)) found.push(label);
  }
  return found.slice(0, 2);
}

function toneFromSignals(
  positive: number,
  negative: number,
  rating: ChannelSummary["rating"],
): SentimentTone {
  if (positive === 0 && negative === 0) {
    if (!rating) return "insufficient";
    if (rating.stars >= 4.2) return "positive";
    if (rating.stars >= 3.5) return "mixed";
    return "cautious";
  }
  if (positive > negative * 1.5 && positive >= 1) return "positive";
  if (negative > positive * 1.5 && negative >= 1) return "cautious";
  return "mixed";
}

function emptySummary(
  channel: NoteChannel,
  strainName: string,
  conditions: string[],
): ChannelSummary {
  const name = strainName.trim() || "this strain";
  const summary =
    channel === "reddit"
      ? conditions.length > 0
        ? `No Reddit comments mention ${name} together with ${joinList(conditions.map((c) => c.toLowerCase()))} yet.`
        : `No Reddit comments were collected for ${name} yet.`
      : channel === "cannabis"
        ? `No Leafly or Weedmaps comments are in this profile for ${name} yet.`
        : `No comments are in this profile for ${name} yet.`;
  return {
    tone: "insufficient",
    label: TONE_LABEL.insufficient,
    rating: null,
    reviewCount: 0,
    positiveHits: 0,
    negativeHits: 0,
    summary,
  };
}

export function summarizeChannel(
  notes: QuoteNote[],
  channel: NoteChannel,
  strainName: string,
  conditions: string[] = [],
  explicitRating?: { leaflyRating?: number; leaflyReviewCount?: number },
): ChannelSummary {
  const rating =
    channel === "reddit" ? null : parseLeaflyRating(notes, explicitRating);
  if (notes.length === 0 && !rating) {
    return emptySummary(channel, strainName, conditions);
  }

  const reviews = individualReviews(notes);
  const texts = reviews.map((n) => n.text.toLowerCase());
  const blob = texts.join(" ");
  const uses =
    channel === "cannabis" || channel === "all" ? weedmapsUses(notes) : [];
  const positive = countHits(blob, POSITIVE_PHRASES);
  const negative = countHits(blob, NEGATIVE_PHRASES);
  const tone = toneFromSignals(positive, negative, rating);
  const themes = topThemes(texts);
  const caveats = caveatsFrom(texts);
  const name = strainName.trim() || "this strain";
  const parts: string[] = [];

  if (rating) {
    const count =
      rating.reviewCount !== null
        ? ` across ${rating.reviewCount.toLocaleString("en-US")} reviews`
        : "";
    parts.push(`Leafly patients rate ${name} ${rating.stars.toFixed(1)}★${count}.`);
  }

  if (reviews.length > 0) {
    const who =
      channel === "reddit"
        ? "Reddit comments"
        : channel === "cannabis"
          ? "Written comments"
          : "Patient comments";
    const lean =
      tone === "positive"
        ? "lean positive"
        : tone === "cautious"
          ? "are more cautious"
          : tone === "mixed"
            ? "are mixed"
            : "are limited";
    const focus =
      channel === "reddit" && conditions.length > 0
        ? ` that mention ${name} and ${joinList(conditions.map((c) => c.toLowerCase()))}`
        : channel === "all" && conditions.length > 0
          ? ` mentioning ${joinList(conditions.map((c) => c.toLowerCase()))}`
          : "";
    const themeBit =
      themes.length > 0 ? ` People often mention ${joinList(themes)}.` : "";
    parts.push(`${who}${focus} ${lean}.${themeBit}`);
  } else if (!rating) {
    parts.push(
      channel === "reddit"
        ? `A few Reddit notes mention ${name}, but there is not enough to judge sentiment.`
        : channel === "cannabis"
          ? `Cannabis-site notes mention ${name}, but there are no individual reviews to judge sentiment.`
          : `There is not enough public reporting on ${name} yet to judge sentiment.`,
    );
  }

  if (uses.length > 0) {
    parts.push(`Weedmaps patients most often tag it for ${joinList(uses)}.`);
  }

  if (caveats.length > 0 && tone !== "insufficient") {
    parts.push(`A few comments note ${joinList(caveats)}.`);
  }

  if (parts.length === 0) {
    return emptySummary(channel, name, conditions);
  }

  return {
    tone,
    label: TONE_LABEL[tone],
    rating,
    reviewCount: reviews.length,
    positiveHits: positive,
    negativeHits: negative,
    summary: parts.join(" "),
  };
}

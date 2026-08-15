export type QuoteNote = { source: string; text: string };

const AILMENT_ALIASES: Record<string, string[]> = {
  insomnia: ["insomnia", "sleep", "asleep", "sleeping"],
  anxiety: ["anxiety", "anxious", "panic"],
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

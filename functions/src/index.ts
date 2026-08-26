// StrainEase backend.
//
// - popularStrains / searchStrain: public Leafly data lookups (no AI).
// - compareStrains / recommendStrainsForConditions: Groq AI synthesis
//   (openai/gpt-oss-120b), auth-gated — Firebase callable functions
//   automatically attach the caller's ID token, and we reject calls
//   without `request.auth`.
import { HttpsError, onCall, type CallableOptions } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, type Transaction } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { evaluateAge, type RegionCode } from "./age";
import { enrichProfiles, lookupProfile } from "./enrich";
import { findDoctors as findDoctorsImpl, type DoctorQuery, type DoctorResult } from "./doctors";
import {
  fetchAllStrains,
  fetchPopular,
  fetchProfiles,
  toPreview,
  type StrainPreview,
} from "./leafly";
import { cachedFetchImage, imageCacheKey } from "./image-cache";
import { callGroq, extractJsonObject } from "./groq";
import { matchRedditSeeds } from "./reddit-seed";
import { clientIp, guestRateLimit, persistResult } from "./results";
import type {
  RecommendationResult,
  RedditSource,
  StrainAnalysis,
  StrainComparison,
  StrainProfile,
  StrainRecommendation,
} from "./types";

export const GROQ_API_KEY = defineSecret("GROQ_API_KEY");

/** 30 days in milliseconds. Mirrors AGE_CLAIM_TTL_MS in the web app. */
export const AGE_CLAIM_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const AI_OPTIONS: CallableOptions = {
  secrets: [GROQ_API_KEY],
  timeoutSeconds: 120,
  memory: "512MiB",
};

/* ── Public data lookups (no AI, no auth required) ─────────────────── */

const POPULAR_LIST_CACHE_DOC = "popularListCache";
const POPULAR_LIST_CACHE_COLLECTION = "strainCatalog";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type PopularListCache = {
  previews: StrainPreview[];
  fetchedAt: number;
  totalCount: number;
};

async function readPopularListCache(): Promise<PopularListCache | null> {
  try {
    const snap = await getFirestore()
      .collection(POPULAR_LIST_CACHE_COLLECTION)
      .doc(POPULAR_LIST_CACHE_DOC)
      .get();
    if (!snap.exists) return null;
    const data = snap.data() as PopularListCache;
    if (!Array.isArray(data.previews) || !data.fetchedAt) return null;
    const age = Date.now() - data.fetchedAt;
    if (age > CACHE_TTL_MS) return null; // Treat stale as miss
    return data;
  } catch {
    return null;
  }
}

async function writePopularListCache(previews: StrainPreview[]): Promise<void> {
  try {
    await getFirestore()
      .collection(POPULAR_LIST_CACHE_COLLECTION)
      .doc(POPULAR_LIST_CACHE_DOC)
      .set(
        {
          previews,
          fetchedAt: Date.now(),
          totalCount: previews.length,
        },
        { merge: true },
      );
  } catch {
    // Best-effort. A missed write just means the next cold start scrapes again.
  }
}

/**
 * Popular strains: cache-first from Firestore, scrape-only on cold miss.
 * The scheduled warmStrainDirectory function keeps the Firestore cache fresh.
 * Caller gets the first 12 previews from the catalog.
 */
export const popularStrains = onCall(
  { timeoutSeconds: 30 },
  async (): Promise<StrainProfile[]> => {
    const cache = await readPopularListCache();
    if (cache && cache.previews.length > 0) {
      // Convert previews back to StrainProfiles (lightweight — no full scrape needed)
      return cache.previews.slice(0, 12).map((p) => ({
        name: p.name,
        inKnowledgeBase: true,
        type: p.type as StrainProfile["type"],
        thcRange: p.thcRange,
        imageUrl: p.imageUrl,
        leaflyRating: p.leaflyRating,
      }));
    }
    // Cold miss — scrape and cache
    const all = await fetchAllStrains();
    const previews = all.map(toPreview);
    void writePopularListCache(previews);
    return all.slice(0, 12);
  },
);

/**
 * Browse the full Leafly catalog with offset pagination.
 * Cache-first from Firestore; falls back to scraping on cold miss.
 * Returns previews (lightweight) for the grid, not full profiles.
 */
export const browseStrains = onCall(
  { timeoutSeconds: 30 },
  async (
    request,
  ): Promise<{
    previews: StrainPreview[];
    totalCount: number;
    offset: number;
    fetchedAt: number;
  }> => {
    const raw = request.data ?? {};
    const offset =
      typeof raw.offset === "number" && raw.offset >= 0 ? raw.offset : 0;
    const limit =
      typeof raw.limit === "number" && raw.limit > 0
        ? Math.min(raw.limit, 100)
        : 24;

    const cache = await readPopularListCache();
    if (cache && cache.previews.length > 0) {
      return {
        previews: cache.previews.slice(offset, offset + limit),
        totalCount: cache.totalCount,
        offset,
        fetchedAt: cache.fetchedAt,
      };
    }

    // Cold miss — scrape, cache, and return the requested slice
    const all = await fetchAllStrains();
    const previews = all.map(toPreview);
    void writePopularListCache(previews);
    return {
      previews: previews.slice(offset, offset + limit),
      totalCount: previews.length,
      offset,
      fetchedAt: Date.now(),
    };
  },
);

/**
 * Scheduled function: runs once per day to warm the Firestore strain catalog cache.
 * This keeps the popularStrains and browseStrains callables fast (Firestore hit)
 * and off Leafly's servers for routine reads.
 *
 * Deployed via: firebase deploy --only functions
 * (The Pub/Sub topic "strains-daily-scrape" must be created in GCP Scheduler:
 *  gcloud scheduler jobs create pubsub strains-daily-scrape \
 *    --schedule="0 3 * * *" --topic=strains-daily-scrape --message-body="{}")
 */
export const warmStrainDirectory = onSchedule(
  { schedule: "0 3 * * *", timeoutSeconds: 540, memory: "512MiB" },
  async () => {
    console.log("[warmStrainDirectory] Starting daily Leafly catalog scrape…");
    const all = await fetchAllStrains();
    const previews = all.map(toPreview);
    await writePopularListCache(previews);
    console.log(
      `[warmStrainDirectory] Cached ${previews.length} strain previews.`,
    );
  },
);

/** Look up one strain by name on Leafly + Weedmaps + Allbud, with reviews and Reddit. */
export const searchStrain = onCall(
  { timeoutSeconds: 60 },
  async (request): Promise<StrainProfile | null> => {
    const name =
      typeof request.data?.name === "string" ? request.data.name : "";
    if (name.trim() === "") return null;
    const conditions = asStringArray(request.data?.conditions);
    return await lookupProfile(name, conditions);
  },
);

/* ── Age verification ─────────────────────────────────────────────── */

/**
 * Guard a callable: throws HttpsError if the request has no auth or the
 * ageVerified custom claim is absent/expired.
 */
async function requireAgeVerified(
  request: { auth?: { uid: string; token?: { ageVerifiedExpiresAt?: number } } },
  HttpsErrorClass: typeof HttpsError,
): Promise<{ uid: string }> {
  if (!request.auth?.uid) {
    throw new HttpsErrorClass("unauthenticated", "Sign in first.");
  }
  const exp = request.auth.token?.ageVerifiedExpiresAt;
  if (!exp || exp < Date.now()) {
    throw new HttpsErrorClass(
      "permission-denied",
      "Age verification expired. Please re-verify from the account page.",
    );
  }
  return { uid: request.auth.uid };
}

/**
 * Records that the signed-in caller has attested to being of legal age in
 * their jurisdiction. Sets the matching custom claim so server-side gates on
 * the AI callables can enforce it, and mirrors the attestation to Firestore
 * for audit / refresh.
 *
 * Re-runs are safe: this callable is idempotent — calling it again with a
 * different region or after expiry simply refreshes the claim TTL.
 */
export const setAgeVerified = onCall(
  { timeoutSeconds: 30 },
  async (
    request,
  ): Promise<{ ok: true; region: RegionCode; expiresAt: number }> => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign in first.");
    }

    const data = (request.data ?? {}) as {
      region?: unknown;
      birthDate?: unknown;
      termsAccepted?: unknown;
      privacyAccepted?: unknown;
    };

    if (data.termsAccepted !== true) {
      throw new HttpsError(
        "failed-precondition",
        "Please accept the Terms of Service first.",
      );
    }
    if (data.privacyAccepted !== true) {
      throw new HttpsError(
        "failed-precondition",
        "Please accept the Privacy Policy first.",
      );
    }

    const evaluation = evaluateAge(data.region, data.birthDate);
    if (!evaluation.ok) {
      throw new HttpsError(
        "failed-precondition",
        evaluation.reason === "underage"
          ? "You must be of legal age in your jurisdiction to use StrainEase."
          : `Invalid age attestation: ${evaluation.reason}.`,
      );
    }

    const uid = request.auth.uid;
    const now = Date.now();
    const expiresAt = now + AGE_CLAIM_TTL_MS;

    // Custom claim gates the AI / doctor callables.
    await getAuth().setCustomUserClaims(uid, {
      ageVerified: true,
      ageVerifiedRegion: evaluation.region,
      ageVerifiedAt: now,
      ageVerifiedExpiresAt: expiresAt,
    });

    // Firestore mirror for audit. Birth year only — we don't want full DOB
    // on the server, just enough to confirm the caller attested.
    const db = getFirestore();
    await db
      .collection("users")
      .doc(uid)
      .collection("ageVerification")
      .doc(evaluation.region)
      .set(
        {
          region: evaluation.region,
          birthYear: new Date(`${data.birthDate}T00:00:00Z`).getUTCFullYear(),
          age: evaluation.age,
          attestedAt: FieldValue.serverTimestamp(),
          expiresAt,
          termsAcceptedAt: FieldValue.serverTimestamp(),
          privacyAcceptedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    return { ok: true, region: evaluation.region, expiresAt };
  },
);

/* ── Community reviews ─────────────────────────────────────────────── */

/**
 * Submit or update a star rating + optional written review for a strain.
 * Auth-gated (requires sign-in) + age-verified. Uses Firestore transaction
 * to atomically update the per-strain aggregate rating.
 *
 * reviewId = `${uid}_${strainSlug}` — enforces one review per user per strain
 * naturally via the Firestore document ID (the rules gate it to the owner).
 */
export const submitStrainReview = onCall(
  { timeoutSeconds: 30 },
  async (
    request,
  ): Promise<{
    ok: true;
    reviewId: string;
    avgRating: number;
    reviewCount: number;
  }> => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign in to leave a review.");
    }

    const data = (request.data ?? {}) as {
      strainSlug?: unknown;
      starRating?: unknown;
      reviewText?: unknown;
      consumptionForm?: unknown;
    };

    const strainSlug =
      typeof data.strainSlug === "string" && data.strainSlug.trim()
        ? data.strainSlug.trim().slice(0, 200)
        : null;
    if (!strainSlug) {
      throw new HttpsError("invalid-argument", "strainSlug is required.");
    }

    const starRating = data.starRating;
    if (typeof starRating !== "number" || starRating < 1 || starRating > 5) {
      throw new HttpsError(
        "invalid-argument",
        "starRating must be a number between 1 and 5.",
      );
    }

    const reviewText =
      typeof data.reviewText === "string"
        ? data.reviewText.trim().slice(0, 500)
        : "";

    const validForms = ["flower", "cart", "edible", "tincture"];
    const consumptionForm =
      typeof data.consumptionForm === "string" &&
      validForms.includes(data.consumptionForm)
        ? data.consumptionForm
        : null;

    const uid = request.auth.uid;
    const reviewId = `${uid}_${strainSlug}`;
    const now = Date.now();

    // Upsert the review doc
    const db = getFirestore();
    const reviewRef = db.collection("strainReviews").doc(reviewId);
    const ratingsRef = db.collection("strainRatings").doc(strainSlug);

    await db.runTransaction(async (tx: Transaction) => {
      // Read existing rating summary (if any)
      const ratingSnap = await tx.get(ratingsRef);
      const existing = ratingSnap.data() as {
        totalStars: number;
        reviewCount: number;
        reviewIds: string[];
      } | null;

      // Read the current review doc to determine if this is create or update
      const reviewSnap = await tx.get(reviewRef);
      const prevReview = reviewSnap.data() as {
        starRating?: number;
      } | null;
      const prevStars = prevReview?.starRating ?? 0;

      const totalStars =
        (existing?.totalStars ?? 0) - prevStars + starRating;
      const existingCount = existing?.reviewCount ?? 0;
      const isNewReview = !reviewSnap.exists;
      const reviewCount = isNewReview
        ? existingCount + 1
        : existingCount;

      // Upsert the review
      tx.set(
        reviewRef,
        {
          strainSlug,
          uid,
          displayName: request.auth?.token?.name ?? request.auth?.token?.email ?? "Anonymous",
          starRating,
          reviewText,
          consumptionForm,
          createdAt: reviewSnap.exists
            ? (reviewSnap.data() as { createdAt: number }).createdAt
            : now,
          updatedAt: now,
        },
        { merge: true },
      );

      // Upsert the aggregate
      tx.set(
        ratingsRef,
        {
          strainSlug,
          totalStars,
          reviewCount,
          avgRating: reviewCount > 0
            ? Math.round((totalStars / reviewCount) * 10) / 10
            : 0,
          updatedAt: now,
        },
        { merge: true },
      );
    });

    // Read back the final aggregate
    const finalSnap = await ratingsRef.get();
    const final = finalSnap.data() as {
      avgRating: number;
      reviewCount: number;
    };

    return {
      ok: true,
      reviewId,
      avgRating: final.avgRating,
      reviewCount: final.reviewCount,
    };
  },
);
/* ── AI synthesis (auth-gated) ─────────────────────────────────────── */

/**
 * Shared Dr. Kaya persona + safety rules. Every per-callable system
 * prompt below starts with this base, then appends only the rules and
 * JSON shape that are unique to that task. Keeps the system prompt
 * under ~600 tokens so the per-request TPM stays well below Groq's
 * free-tier 8K cap.
 */
const DR_KAYA_BASE_PROMPT = `You are Dr. Kaya, StrainEase's AI cannabis care assistant. Base every claim on the strain data provided. Never invent numbers, terpenes, effects, or uses.

When a strain object includes sourceAttribution, the 'value' is the consolidated figure (averaged across Leafly, Weedmaps, Allbud) and 'sources' is what each catalog said. Use it to sanity-check the consolidated value — e.g. when one source claims 30% THC and the others say 20%, prefer the lower end for an anxious patient. Do not surface source names in patient-facing output.

Strains marked "noCuratedProfile": true were not found in the catalog. Research them from your knowledge of how the strain is commonly described on Leafly, Weedmaps, Reddit, dispensary menus, and Google. Only state details you are confident are commonly reported; otherwise say "not verified" or call out the uncertainty.

The patient has a saved set of ailments. For EACH, honestly evaluate whether the strain is a reasonable match based on its commonly reported uses and effects. Speak directly to the patient ("for your insomnia…"). If the typical profile does not fit an ailment, say so plainly (e.g. "this strain tends not to address X") rather than stretching to find a positive angle. Do not skew positive. Skip any ailment you would have to invent a connection for.

Only mention a medication when there is a commonly cited interaction risk (sedative load with benzodiazepines, BP effects with certain antihypertensives, CYP450 warnings with SSRIs/antipsychotics). Always phrase as "ask your clinician about combining with X" — never advise stopping a prescription. When in doubt, omit.

Never promise a cure, never advise stopping prescribed medication, and never diagnose. Encourage the patient to talk to their healthcare provider. Write for the patient: precise, calm, practical, low-jargon. If you use a technical term, define it in one short phrase.

Keep section bodies short and easy to skim on a phone. Split each section into 2-4 short paragraphs (1-2 sentences each), separated by a single blank line (use the literal "\\n\\n" so the client can render paragraph spacing). No markdown, no inner headings, no bullet lists inside a section.

Respond with ONLY a single JSON object. No markdown, no text outside the JSON.`;

const COMPARE_SYSTEM_PROMPT = `${DR_KAYA_BASE_PROMPT}

You're choosing between strains for a patient deciding which to try. communityNotes may include Leafly reviews, Weedmaps tags, Allbud tags, and real Reddit comments about the patient's ailments — use them, do not invent additional first-person quotes. If one or more condition focuses are given, name the single best fit. Honor the patient's context (time of day, form, THC sensitivity, medications caution-only, owned strains, free-text note) when present.

JSON shape (all fields required):
{
  "headline": "one sentence, 18 words max, the practical takeaway for the patient",
  "summary": "2-4 sentences synthesizing the comparison",
  "forCondition": {"best": "strain name", "why": "1-2 sentences", "runnerUp": "strain name"} or null,
  "keyDifferences": ["3-5 short bullets"],
  "commonGround": ["2-3 short bullets"],
  "cautions": ["2-4 short practical cautions, including consulting a physician and starting with a low dose"],
  "redditSources": [{"url": "https://old.reddit.com/r/<sub>/comments/<id>/<slug>/", "subreddit": "<sub>", "title": "thread title", "snippet": "optional 1-sentence vibe", "score": 0}]
}

Reddit: pick ONLY from the vetted list in the user message. Copy url/subreddit/title verbatim. 1–3 threads per strain, deduped across strains. Prefer threads matching the patient's condition focus. Empty list → return [].`;

const RECOMMEND_SYSTEM_PROMPT = `${DR_KAYA_BASE_PROMPT}

The patient tells you which symptoms or conditions they are treating; you recommend the strains most commonly reported to help. Recommend 3-5 distinct strains, best fit first. Each needs a concrete reason tied to symptoms, who it suits best, and one practical caution. Respect the potency preference if given. You may also recommend well-known strains not in the provided list, but only ones you are confident really exist and are commonly reported for these symptoms.

JSON shape (all fields required):
{
  "headline": "one sentence, 18 words max, the practical takeaway",
  "summary": "2-4 sentences",
  "recommendations": [{"strainName": "...", "reason": "1-2 sentences tied to symptoms", "bestFor": "short phrase on who it suits", "caution": "one short practical caution"}],
  "redditSources": [{"url": "https://old.reddit.com/r/<sub>/comments/<id>/<slug>/", "subreddit": "<sub>", "title": "thread title", "snippet": "optional", "score": 0}]
}

Reddit: pick ONLY from the vetted list in the user message. Copy url/subreddit/title verbatim. 1–3 threads per recommendation, deduped. Empty list → return [].`;

/**
 * Per-strain AI description for a specific patient. The patient has a
 * saved set of ailments; we tailor the writeup to those while still
 * keeping a healthy dose of general, factual information so the page
 * is useful even if the ailments don't all overlap with the strain.
 *
 * We also accept the patient's medications and a short relief-log
 * summary so the model can flag known interactions (caution only,
 * never "stop your prescription") and weight "What it might do for
 * you" against how similar strains have actually worked for them.
 *
 * Output is split into a fixed three sections so the client can render
 * them as three discrete blocks instead of one wall of text:
 *   - "Overview"               — what this strain is, plain-language intro.
 *   - "What it might do for you" — tied to the patient's ailments.
 *   - "What to expect"         — practical considerations (potency,
 *                                timing, cautions).
 *
 * Each section body is short prose (2-4 sentences), no markdown, no
 * headings inside the body.
 */
const DESCRIBE_SYSTEM_PROMPT = `${DR_KAYA_BASE_PROMPT}

You are writing a patient-facing description for a single cannabis strain. Keep the page informative even when the strain only partially matches the patient's ailments — roughly two-thirds of each section can be general, one-third tailored.

Use the relief log the patient has provided (a short history of how previous strains went for these same ailments) to calibrate "What it might do for you" — e.g. "Last time Northern Lights was too strong for your insomnia; this one leans similar, so start lower." If the relief log is empty, say nothing.

The "What to expect" section must include a short, practical caution (potency, timing, side-effect watch-out) and a gentle nudge to start low.

JSON shape (all fields required). Each body is 2-4 short paragraphs (1-2 sentences each), separated by a single "\\n\\n" so the client can render them with paragraph spacing:
{
  "sections": [
    {"heading": "Overview", "body": "2-4 short paragraphs introducing the strain"},
    {"heading": "What it might do for you", "body": "2-4 short paragraphs honestly rating each of the patient's ailments against the strain, with mismatches called out plainly, and calibrated to medications + recent history with other strains"},
    {"heading": "What to expect", "body": "2-4 short paragraphs on practical considerations, including a caution to start low"}
  ]
}`;

/**
 * System prompt for `elaborateSection` — the ✨ Ask Maya button. We
 * keep the same Dr. Kaya persona and the same hard rules (no invented
 * numbers, no medication stop advice, no diagnoses) but ask the model
 * to *expand* a single section instead of producing all three.
 *
 * The user's current section body is passed in too so the model can
 * stay grounded and avoid contradicting the already-displayed copy.
 */
const ELABORATE_SECTION_SYSTEM_PROMPT = `${DR_KAYA_BASE_PROMPT}

The patient is reading a three-section strain description on the web app and just tapped "✨ Ask Maya" on one of the sections. Your job is to expand that single section in more depth.

The current body of the section is provided as "sectionBody". Do NOT contradict it. Treat it as the short version of what the patient already sees; your elaboration should add depth, mechanism, or example, not replace the headline.

JSON shape (all fields required):
{
  "elaboration": "2-4 short paragraphs (1-2 sentences each), separated by a single \\n\\n so the client can render them with paragraph spacing"
}`;

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((x): x is string => typeof x === "string")
    : [];
}

const POTENCY_LABELS: Record<string, string> = {
  mild: "mild (THC under roughly 15%)",
  balanced: "balanced (THC roughly 15-22%)",
  strong: "strong (THC above roughly 22%)",
};

type ResearchPrefs = {
  timeOfDay?: string;
  consumeForm?: string;
  thcSensitivity?: string;
  medications?: string;
  ownedStrains?: string[];
  patientNote?: string;
  reliefSummary?: string;
};

function parsePrefs(raw: unknown): ResearchPrefs | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Record<string, unknown>;
  const timeOfDay =
    p.timeOfDay === "morning" ||
    p.timeOfDay === "afternoon" ||
    p.timeOfDay === "night"
      ? p.timeOfDay
      : undefined;
  const consumeForm =
    p.consumeForm === "flower" ||
    p.consumeForm === "cart" ||
    p.consumeForm === "edible" ||
    p.consumeForm === "tincture"
      ? p.consumeForm
      : undefined;
  const thcSensitivity =
    p.thcSensitivity === "anxious-high-thc" ||
    p.thcSensitivity === "experienced"
      ? p.thcSensitivity
      : undefined;
  const medications =
    typeof p.medications === "string" && p.medications.trim()
      ? p.medications.trim().slice(0, 240)
      : undefined;
  const ownedStrains = asStringArray(p.ownedStrains)
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .slice(0, 8);
  const patientNote =
    typeof p.patientNote === "string" && p.patientNote.trim()
      ? p.patientNote.trim().slice(0, 400)
      : undefined;
  const reliefSummary =
    typeof p.reliefSummary === "string" && p.reliefSummary.trim()
      ? p.reliefSummary.trim().slice(0, 800)
      : undefined;
  if (
    !timeOfDay &&
    !consumeForm &&
    !thcSensitivity &&
    !medications &&
    ownedStrains.length === 0 &&
    !patientNote &&
    !reliefSummary
  ) {
    return undefined;
  }
  return {
    timeOfDay,
    consumeForm,
    thcSensitivity,
    medications,
    ownedStrains: ownedStrains.length > 0 ? ownedStrains : undefined,
    patientNote,
    reliefSummary,
  };
}

function prefsBlock(prefs: ResearchPrefs | undefined): string {
  if (!prefs) return "";
  const lines = ["Patient context:"];
  if (prefs.timeOfDay) lines.push(`- Time of use: ${prefs.timeOfDay}`);
  if (prefs.consumeForm) lines.push(`- Form they will use: ${prefs.consumeForm}`);
  if (prefs.thcSensitivity === "anxious-high-thc") {
    lines.push(
      "- THC-sensitive: high-THC sativas often worsen their anxiety. Prefer gentler, more balanced options.",
    );
  } else if (prefs.thcSensitivity === "experienced") {
    lines.push("- Experienced with stronger flower; potency can run higher.");
  }
  if (prefs.medications) {
    lines.push(
      `- They take: ${prefs.medications}. Do not advise stopping medication. Include a caution to check interactions with their clinician.`,
    );
  }
  if (prefs.ownedStrains && prefs.ownedStrains.length > 0) {
    lines.push(
      `- They already have: ${prefs.ownedStrains.join(", ")}. Weigh those as convenient options when they fit.`,
    );
  }
  if (prefs.patientNote) {
    lines.push(
      `- In their own words (treat as primary intent): "${prefs.patientNote}"`,
    );
  }
  if (prefs.reliefSummary) {
    lines.push(
      `- What actually happened last time (weight this heavily): ${prefs.reliefSummary}`,
    );
  }
  return lines.join("\n");
}

/**
 * Cap the per-strain fields we send to the LLM so a single rich profile
 * doesn't blow past Groq's free-tier 8K TPM budget. Catalog rows are
 * small on their own, but a real Leafly description can run 3-5K chars,
 * terpenes list a long `profile` per entry, and communityNotes grow
 * unbounded. These caps keep the user message under ~3K tokens per
 * strain with the typical mix of fields populated.
 */
const PROMPT_DESCRIPTION_MAX = 800;
const PROMPT_COMMUNITY_NOTE_TEXT_MAX = 280;
const PROMPT_COMMUNITY_NOTES_MAX = 2;
const PROMPT_TERPENE_PROFILE_MAX = 80;
const PROMPT_TERPENES_MAX = 5;
const PROMPT_EFFECTS_MAX = 6;
const PROMPT_MEDICAL_USES_MAX = 6;
const PROMPT_SIDE_EFFECTS_MAX = 4;

function capString(value: string | undefined, max: number): string | undefined {
  if (typeof value !== "string" || value.length <= max) return value;
  return value.slice(0, max - 1).trimEnd() + "…";
}

/**
 * JSON.stringify without indentation. Pretty-printing adds ~30% tokens
 * to every payload we send to the LLM, with no benefit to the model —
 * it parses JSON the same way. We always use this for user-message
 * payloads to keep the request under Groq's free-tier 8K TPM cap.
 */
function compactJson(value: unknown): string {
  return JSON.stringify(value);
}

function compactStrainFields(row: Record<string, unknown>): Record<string, unknown> {
  if (typeof row.description === "string") {
    row.description = capString(row.description, PROMPT_DESCRIPTION_MAX);
  }
  if (Array.isArray(row.terpenes)) {
    row.terpenes = (row.terpenes as Array<Record<string, unknown>>)
      .slice(0, PROMPT_TERPENES_MAX)
      .map((t) => {
        if (t && typeof t === "object" && "profile" in t) {
          return { ...t, profile: capString(t.profile as string | undefined, PROMPT_TERPENE_PROFILE_MAX) };
        }
        return t;
      });
  }
  if (Array.isArray(row.effects)) {
    row.effects = (row.effects as unknown[]).slice(0, PROMPT_EFFECTS_MAX);
  }
  if (Array.isArray(row.medicalUses)) {
    row.medicalUses = (row.medicalUses as string[]).slice(0, PROMPT_MEDICAL_USES_MAX);
  }
  if (Array.isArray(row.sideEffects)) {
    row.sideEffects = (row.sideEffects as string[]).slice(0, PROMPT_SIDE_EFFECTS_MAX);
  }
  if (Array.isArray(row.communityNotes)) {
    row.communityNotes = (row.communityNotes as Array<Record<string, unknown>>)
      .slice(0, PROMPT_COMMUNITY_NOTES_MAX)
      .map((n) => {
        if (n && typeof n === "object" && "text" in n) {
          return { ...n, text: capString(n.text as string | undefined, PROMPT_COMMUNITY_NOTE_TEXT_MAX) };
        }
        return n;
      });
  }
  return row;
}

export function compareStrainPayload(s: StrainProfile) {
  const hasBody = Boolean(
    s.inKnowledgeBase ||
      s.type ||
      s.thcRange ||
      s.description ||
      (s.effects && s.effects.length > 0) ||
      (s.communityNotes && s.communityNotes.length > 0),
  );
  if (!hasBody) return { name: s.name, noCuratedProfile: true as const };
  return compactStrainFields({
    name: s.name,
    type: s.type,
    thcRange: s.thcRange,
    cbdRange: s.cbdRange,
    terpenes: s.terpenes,
    medicalUses: s.medicalUses,
    effects: s.effects,
    description: s.description,
    communityNotes: s.communityNotes,
    // Per-source attribution — Maya can audit any number she wants
    // to second-guess. Omitted entirely when every field was a clean
    // single-source copy.
    sourceAttribution: s.sourceAttribution,
    sources: s.sources,
    noCuratedProfile: !s.inKnowledgeBase,
  });
}

function comparePrompt(
  strains: StrainProfile[],
  conditions: string[] | undefined,
  prefs?: ResearchPrefs,
): string {
  const payload = strains.map(compareStrainPayload);
  // Filter the Reddit seed list to threads relevant to this patient's
  // condition focus + the strains in play. The full pool (~45 entries)
  // blows past Groq's on-demand TPM budget; 8 vetted, ranked threads
  // is plenty since the model only picks 1-3 anyway.
  const redditSeeds = matchRedditSeeds({
    conditions: conditions ?? [],
    strainNames: strains.map((s) => s.name),
    limit: 8,
  });
  return [
    "Compare the following cannabis strains for a patient deciding which one to try.",
    `Condition focus: ${
      conditions && conditions.length > 0
        ? conditions.join(", ")
        : "none — give a general comparison focused on patient symptom relief"
    }`,
    prefsBlock(prefs),
    "",
    "Strain data (Leafly + Weedmaps, with Reddit quotes when found):",
    compactJson(payload),
    "",
    'Strains marked "noCuratedProfile": true were not found on Leafly or Weedmaps. Research them from your knowledge of how they are commonly described on Leafly, Weedmaps, Reddit, Google, and dispensary menus, and be explicit in the summary when a detail is a commonly-reported figure rather than a verified lab result.',
    "",
    "Vetted Reddit threads (pick from this list only — copy url / subreddit / title verbatim):",
    compactJson(redditSeeds),
    "",
    "Return only the JSON object described in your instructions.",
  ].join("\n");
}

function recommendPrompt(
  strains: StrainProfile[],
  conditions: string[],
  potency: string | undefined,
  prefs?: ResearchPrefs,
): string {
  const payload = strains.map((s) =>
    compactStrainFields({
      name: s.name,
      type: s.type,
      thcRange: s.thcRange,
      cbdRange: s.cbdRange,
      terpenes: s.terpenes,
      medicalUses: s.medicalUses,
      effects: s.effects,
      description: s.description,
    }),
  );
  // Filter the Reddit seed list to threads relevant to this patient's
  // symptoms + the popular strains in play. Same TPM-budget reason as
  // comparePrompt above.
  const redditSeeds = matchRedditSeeds({
    conditions,
    strainNames: strains.map((s) => s.name),
    limit: 8,
  });
  return [
    "Recommend the best cannabis strains for a patient treating these symptoms:",
    conditions.join(", "),
    potency
      ? `Potency preference: ${POTENCY_LABELS[potency]}.`
      : "Potency preference: none — pick whatever potency fits the symptoms best.",
    prefsBlock(prefs),
    "",
    "Strain data (full Leafly profiles — type, potency, medical uses, effects, reviews):",
    compactJson(payload),
    "",
    "You may also suggest strains not in this list from your general knowledge, as long as you are confident they are real and commonly reported for these symptoms.",
    "",
    "Vetted Reddit threads (pick from this list only — copy url / subreddit / title verbatim):",
    compactJson(redditSeeds),
    "",
    "Return only the JSON object described in your instructions.",
  ].join("\n");
}

function normalizeRedditSources(value: unknown): RedditSource[] {
  if (!Array.isArray(value)) return [];
  // Only accept URLs in the vetted old.reddit.com form. Anything else is
  // dropped silently — we never want to surface a hallucinated Reddit link.
  const allowedUrl = /^https:\/\/old\.reddit\.com\/r\/[^/]+\/comments\/[a-z0-9]{4,}\//i;
  const seen = new Set<string>();
  const out: RedditSource[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const url = typeof r.url === "string" ? r.url.trim() : "";
    const subreddit = typeof r.subreddit === "string" ? r.subreddit.trim() : "";
    const title = typeof r.title === "string" ? r.title.trim() : "";
    if (!url || !subreddit || !title) continue;
    // Strip reddit.com / www.reddit.com → old.reddit.com so links open cleanly.
    const normalizedUrl = url
      .replace(/^https?:\/\/(www\.)?reddit\.com/, "https://old.reddit.com")
      .replace(/^https?:\/\/np\.reddit\.com/, "https://old.reddit.com");
    if (!allowedUrl.test(normalizedUrl)) continue;
    const key = normalizedUrl.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      url: normalizedUrl,
      subreddit,
      title,
      snippet: typeof r.snippet === "string" ? r.snippet.trim() : undefined,
      score:
        typeof r.score === "number" && Number.isFinite(r.score)
          ? r.score
          : undefined,
    });
    if (out.length >= 8) break;
  }
  return out;
}

function parseAnalysis(content: string): StrainAnalysis {
  const fallback: StrainAnalysis = {
    headline: "Comparison complete",
    summary: content.trim(),
    forCondition: null,
    keyDifferences: [],
    commonGround: [],
    cautions: [],
  };
  if (!content) return fallback;
  const parsed = extractJsonObject(content);
  if (parsed === null) return fallback;

  const p = (parsed ?? {}) as Record<string, unknown>;
  const asStrings = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((x): x is string => typeof x === "string")
      : [];
  const forConditionRaw = p.forCondition as
    | Record<string, unknown>
    | null
    | undefined;

  const redditSources = normalizeRedditSources(p.redditSources);
  return {
    headline:
      typeof p.headline === "string" && p.headline.trim()
        ? p.headline.trim()
        : fallback.headline,
    summary:
      typeof p.summary === "string" && p.summary.trim()
        ? p.summary.trim()
        : fallback.summary,
    forCondition:
      forConditionRaw &&
      typeof forConditionRaw.best === "string" &&
      typeof forConditionRaw.why === "string"
        ? {
            best: forConditionRaw.best,
            why: forConditionRaw.why,
            runnerUp:
              typeof forConditionRaw.runnerUp === "string"
                ? forConditionRaw.runnerUp
                : "",
          }
        : null,
    keyDifferences: asStrings(p.keyDifferences),
    commonGround: asStrings(p.commonGround),
    cautions: asStrings(p.cautions),
    redditSources: redditSources.length > 0 ? redditSources : undefined,
  };
}

function normalizeRecommendations(value: unknown): StrainRecommendation[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: StrainRecommendation[] = [];
  for (const item of value) {
    const r = (item ?? {}) as Record<string, unknown>;
    const name = typeof r.strainName === "string" ? r.strainName.trim() : "";
    if (name === "") continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      strainName: name,
      reason: typeof r.reason === "string" ? r.reason.trim() : "",
      bestFor: typeof r.bestFor === "string" ? r.bestFor.trim() : "",
      caution: typeof r.caution === "string" ? r.caution.trim() : "",
    });
  }
  return out.slice(0, 6);
}

/**
 * Compare 2-3 strains side by side. Auth required: the caller must be signed
 * in (request.auth is populated by Firebase from the client's ID token).
 * Guest callers (no auth) go through the IP rate limit instead. The client
 * already gates everything behind the local age gate, so the AI callable
 * trusts the caller's auth and doesn't re-check the custom claim.
 */
export const compareStrains = onCall(
  AI_OPTIONS,
  async (request): Promise<StrainComparison & { resultId?: string }> => {
    if (!request.auth) {
      try {
        guestRateLimit(clientIp(request));
      } catch (err) {
        throw new HttpsError(
          "resource-exhausted",
          err instanceof Error ? err.message : "Too many guest searches.",
        );
      }
    }

    const data = (request.data ?? {}) as {
      strainNames?: unknown;
      condition?: unknown;
      prefs?: unknown;
      language?: unknown;
    };
    const names = asStringArray(data.strainNames);
    if (names.length < 2 || names.length > 3) {
      throw new HttpsError("invalid-argument", "Select 2–3 strains to compare.");
    }
    const condition = asStringArray(data.condition);
    const prefs = parsePrefs(data.prefs);
    const language = parseOutputLanguage(data.language);

    // Full profiles: Leafly + Weedmaps, Reddit quotes for the ailments,
    // and Groq fill-in when a name is missing from both catalogs.
    const strains = await enrichProfiles(
      names,
      condition,
      GROQ_API_KEY.value(),
    );

    const content = await callGroq(GROQ_API_KEY.value(), [
      {
        role: "system",
        content: withLanguageClause(COMPARE_SYSTEM_PROMPT, language),
      },
      { role: "user", content: comparePrompt(strains, condition, prefs) },
    ]);

    const analysis = parseAnalysis(content);
    const payload = { strains, analysis };
    let resultId: string | undefined;
    try {
      resultId = await persistResult({
        kind: "compare",
        args: { strainNames: names, condition, prefs },
        result: payload,
        uid: request.auth?.uid ?? null,
      });
    } catch {
      // Persistence is best-effort — the comparison still returns.
    }
    return { ...payload, resultId };
  },
);

/**
 * Find the best strains for a patient's symptoms. Auth required. Guest
 * callers go through the IP rate limit. The client already gates the page
 * behind the local age gate, so the callable trusts the caller's auth and
 * does not re-check the (now removed) age-verified custom claim.
 */
export const recommendStrainsForConditions = onCall(
  AI_OPTIONS,
  async (request): Promise<RecommendationResult & { resultId?: string }> => {
    if (!request.auth) {
      try {
        guestRateLimit(clientIp(request));
      } catch (err) {
        throw new HttpsError(
          "resource-exhausted",
          err instanceof Error ? err.message : "Too many guest searches.",
        );
      }
    }

    const data = (request.data ?? {}) as {
      conditions?: unknown;
      potency?: unknown;
      prefs?: unknown;
      language?: unknown;
    };
    const conditions = asStringArray(data.conditions);
    if (conditions.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "Tell us at least one symptom or condition to search for.",
      );
    }
    const potencyRaw = data.potency;
    const potency =
      potencyRaw === "mild" || potencyRaw === "balanced" || potencyRaw === "strong"
        ? potencyRaw
        : undefined;
    const prefs = parsePrefs(data.prefs);
    const language = parseOutputLanguage(data.language);

    // Rank against full Leafly detail profiles (not the popular-list
    // summaries) so medical uses, CBD, lineage and side effects are present.
    const popular = await fetchPopular();
    const detailed = await fetchProfiles(popular.map((p) => p.name));

    const content = await callGroq(GROQ_API_KEY.value(), [
      {
        role: "system",
        content: withLanguageClause(RECOMMEND_SYSTEM_PROMPT, language),
      },
      {
        role: "user",
        content: recommendPrompt(detailed, conditions, potency, prefs),
      },
    ]);

    const parsed = extractJsonObject(content);
    const p = (parsed ?? {}) as Record<string, unknown>;
    const recommendations = normalizeRecommendations(p.recommendations);
    if (recommendations.length === 0) {
      throw new HttpsError(
        "internal",
        "The research service did not return usable recommendations. Please try again.",
      );
    }

    const names = [...new Set(recommendations.map((r) => r.strainName))];
    const strains = await enrichProfiles(
      names,
      conditions,
      GROQ_API_KEY.value(),
    );

    const payload: import("./types").RecommendationResult = {
      headline:
        typeof p.headline === "string" && p.headline.trim()
          ? p.headline.trim()
          : "Here are the best matches for you",
      summary:
        typeof p.summary === "string" && p.summary.trim()
          ? p.summary.trim()
          : "No summary returned.",
      recommendations,
      strains,
    };
    const redditSources = normalizeRedditSources(p.redditSources);
    if (redditSources.length > 0) {
      payload.redditSources = redditSources;
    }
    let resultId: string | undefined;
    try {
      resultId = await persistResult({
        kind: "find",
        args: { conditions, potency, prefs },
        result: payload,
        uid: request.auth?.uid ?? null,
      });
    } catch {
      // Persistence is best-effort — the recommendation still returns.
    }
    return { ...payload, resultId };
  },
);

/* ── Image proxy (public, no auth) ────────────────────────────────────── */

/**
 * Build the public Storage URL for a cached image. The image-cache
 * module stores the object with public-read ACL (via `makePublic()`),
 * so the browser can fetch it directly via the public
 * `https://storage.googleapis.com/...` URL without a signed URL —
 * which would require the runtime SA to hold
 * `iam.serviceAccounts.signBlob`, a permission Firebase's default
 * compute SA does not have. A previous version of this function used
 * `getSignedUrl` and the missing permission turned every call into
 * an opaque `INTERNAL` error from Cloud Functions, with the browser
 * never seeing a working URL.
 */
export function publicStrainImageUrl(bucket: string, key: string): string {
  return `https://storage.googleapis.com/${bucket}/strain-images/${key}`;
}

/**
 * Cache + serve a strain image. The function fetches the upstream
 * bytes once via cachedFetchImage (in-memory then Storage), then
 * returns a permanent public Storage URL pointing at the cached
 * object so the browser can fetch it directly with normal HTTP
 * caching. Repeat calls within the 7-day TTL hit the Storage copy
 * without re-touching Leafly.
 */
export const cachedStrainImage = onCall(
  { timeoutSeconds: 30, memory: "256MiB" },
  async (request): Promise<{
    url: string;
    contentType: string;
    bytes: number;
    source: "memory" | "storage" | "network";
  }> => {
    const url =
      typeof request.data?.url === "string" ? request.data.url : "";
    if (!/^https?:\/\//i.test(url)) {
      throw new HttpsError("invalid-argument", "url must be an absolute http(s) URL.");
    }
    const cached = await cachedFetchImage(url);
    const key = imageCacheKey(url);
    const bucket = getStorage().bucket().name;
    return {
      url: publicStrainImageUrl(bucket, key),
      contentType: cached.contentType,
      bytes: cached.bytes.length,
      source: cached.source,
    };
  },
);

/**
 * Look up medical-marijuana doctors near the patient. Scrapes Leafly's
 * public doctors directory (the page embedded `__NEXT_DATA__` blob
 * carries the structured listings) and reverse-geocodes the caller's
 * coordinates via OpenStreetMap Nominatim when only lat/lon is given.
 * Public — guest callers go through IP rate limiting. The client gates
 * the page behind the local age gate, so the callable trusts the caller's
 * auth and does not re-check the (now removed) age-verified custom claim.
 */
export const findDoctors = onCall(
  { timeoutSeconds: 30, memory: "256MiB" },
  async (request): Promise<DoctorResult> => {
    if (!request.auth) {
      try {
        guestRateLimit(clientIp(request));
      } catch (err) {
        throw new HttpsError(
          "resource-exhausted",
          err instanceof Error ? err.message : "Too many guest searches.",
        );
      }
    }

    const data = (request.data ?? {}) as Partial<DoctorQuery>;
    const lat =
      typeof data.lat === "number" && Number.isFinite(data.lat) ? data.lat : undefined;
    const lon =
      typeof data.lon === "number" && Number.isFinite(data.lon) ? data.lon : undefined;
    const city = typeof data.city === "string" ? data.city.trim() : undefined;
    const state = typeof data.state === "string" ? data.state.trim() : undefined;
    const zip = typeof data.zip === "string" ? data.zip.trim() : undefined;
    const radiusMiles =
      typeof data.radiusMiles === "number" && Number.isFinite(data.radiusMiles)
        ? Math.max(1, Math.min(data.radiusMiles, 200))
        : undefined;

    if (!lat && !lon && !city && !state && !zip) {
      throw new HttpsError(
        "invalid-argument",
        "Provide lat/lon, a city+state pair, or a zip code.",
      );
    }

    return await findDoctorsImpl({ lat, lon, city, state, zip, radiusMiles });
  },
);

/* ── Patient-tailored per-strain description (auth-gated) ──────────── */

/** Section shape returned by describeStrainForUser. */
type StrainDescriptionSection = {
  heading: string;
  body: string;
};

/** Response shape for describeStrainForUser. */
type StrainDescriptionResult = {
  /** Always exactly three sections, in display order. */
  sections: [StrainDescriptionSection, StrainDescriptionSection, StrainDescriptionSection];
};

/**
 * Build a compact, LLM-safe payload from a StrainProfile. Mirrors
 * compareStrainPayload but strips the fields the description prompt
 * does not need (communityNotes, redditSources) to keep the user
 * message tight.
 */
export function describeStrainPayload(s: StrainProfile) {
  const hasBody = Boolean(
    s.inKnowledgeBase ||
      s.type ||
      s.thcRange ||
      s.description ||
      (s.effects && s.effects.length > 0) ||
      (s.medicalUses && s.medicalUses.length > 0),
  );
  if (!hasBody) return { name: s.name, noCuratedProfile: true as const };
  return compactStrainFields({
    name: s.name,
    type: s.type,
    thcRange: s.thcRange,
    cbdRange: s.cbdRange,
    lineage: s.lineage,
    terpenes: s.terpenes,
    medicalUses: s.medicalUses,
    effects: s.effects,
    sideEffects: s.sideEffects,
    description: s.description,
    noCuratedProfile: !s.inKnowledgeBase,
  });
}

export function describePrompt(
  strain: StrainProfile,
  ailments: string[],
  medications: string[],
  reliefHistory: string,
): string {
  const payload = describeStrainPayload(strain);
  const contextLines: string[] = [];
  contextLines.push(
    ailments.length > 0
      ? `Patient's saved ailments (tailor the middle section to these, in this priority order): ${ailments.join(", ")}`
      : "Patient's saved ailments: none — give a general description across all three sections.",
  );
  contextLines.push(
    medications.length > 0
      ? `Patient's current medications (mention a specific drug only when there is a commonly cited cannabis interaction — always phrase as "ask your clinician about combining with X", never advise stopping): ${medications.join(", ")}`
      : "Patient's current medications: none reported.",
  );
  contextLines.push(
    reliefHistory.length > 0
      ? `Patient's recent relief log with other strains, newest first (use to calibrate the middle section against what has actually worked): ${reliefHistory}`
      : "Patient's recent relief log: empty.",
  );
  return [
    "Write a patient-facing description for this cannabis strain.",
    ...contextLines,
    "",
    "Strain data:",
    compactJson(payload),
    "",
    'Strains marked "noCuratedProfile": true were not found on Leafly or Weedmaps. Research them from your knowledge of how they are commonly described on Leafly, Weedmaps, Reddit, Google, and dispensary menus, and be explicit in the "Overview" when a detail is a commonly-reported figure rather than a verified lab result.',
    "",
    "Return only the JSON object described in your instructions.",
  ].join("\n");
}

/**
 * Validate the LLM's JSON shape. We always want exactly three sections,
 * with non-empty headings and bodies. If the model returns fewer, fill
 * in the missing ones with a generic safe placeholder so the client
 * still has something to render instead of breaking layout.
 */
function normalizeDescriptionSections(
  value: unknown,
  fallbackName: string,
): [StrainDescriptionSection, StrainDescriptionSection, StrainDescriptionSection] {
  const list: StrainDescriptionSection[] = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const r = item as Record<string, unknown>;
      const heading =
        typeof r.heading === "string" ? r.heading.trim() : "";
      const body = typeof r.body === "string" ? r.body.trim() : "";
      if (!heading || !body) continue;
      list.push({ heading, body });
    }
  }
  const filler = (heading: string, body: string): StrainDescriptionSection => ({
    heading,
    body,
  });
  const overview = list[0] ?? filler("Overview", `${fallbackName} is a cannabis strain. Talk to your healthcare provider before trying it, and start with a low dose.`);
  const tailored =
    list[1] ??
    filler(
      "What it might do for you",
      "We didn't get a tailored writeup for your saved symptoms. Compare it against other strains in your list for a closer fit.",
    );
  const expect =
    list[2] ??
    filler(
      "What to expect",
      "Start low, give the dose time to settle, and check in with how you feel before taking more.",
    );
  return [overview, tailored, expect];
}

function parseDescription(
  content: string,
  fallbackName: string,
): StrainDescriptionResult {
  const parsed = extractJsonObject(content) as { sections?: unknown } | null;
  return {
    sections: normalizeDescriptionSections(parsed?.sections, fallbackName),
  };
}

/**
 * Default language every AI-written response is rendered in. We pin this
 * on the model so the output stays in the user's chosen language and
 * does not drift into another language (e.g. random Chinese for strains
 * with international names). Clients can override by passing a
 * `language` field to the request, e.g. "Spanish" or "Japanese".
 */
const DEFAULT_OUTPUT_LANGUAGE = "English";

/**
 * Sanitize a `language` request field. We accept a short human-readable
 * language name (e.g. "English", "Spanish", "Japanese") and reject
 * anything that smells like prompt-injection: long strings, newlines,
 * or non-letters. We deliberately keep the regex narrow so a malicious
 * caller can't sneak instructions into the system prompt.
 */
function parseOutputLanguage(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_OUTPUT_LANGUAGE;
  const trimmed = value.trim();
  if (trimmed === "") return DEFAULT_OUTPUT_LANGUAGE;
  if (trimmed.length > 40) return DEFAULT_OUTPUT_LANGUAGE;
  if (/[\r\n]/.test(trimmed)) return DEFAULT_OUTPUT_LANGUAGE;
  // Letters, spaces, hyphens, parentheses only — no quotes, `<`, `:`.
  if (!/^[\p{L} ()'-]+$/u.test(trimmed)) return DEFAULT_OUTPUT_LANGUAGE;
  return trimmed;
}

/**
 * Append a pinned-language clause to a system prompt. The clause tells
 * the model to write the entire response in the user's language and
 * not switch into any other language (we have seen random Chinese and
 * Korean show up for strains with international names).
 */
function withLanguageClause(base: string, language: string): string {
  return (
    `${base}\n\n` +
    `Language pinning (do not skip):\n` +
    `- Write the entire response in ${language}. Do not switch into any other language, even briefly, even for proper nouns, examples, or strain names that originated in another language. Transliterate or translate foreign-language quotes instead of copying them verbatim.`
  );
}

/** Exposed for tests. */
export const __testing = {
  normalizeDescriptionSections,
  DESCRIBE_SYSTEM_PROMPT,
  ELABORATE_SECTION_SYSTEM_PROMPT,
  parseOutputLanguage,
  parseElaboration,
  withLanguageClause,
};

/**
 * Generate a tailored, three-section description for a single strain.
 * Auth-gated: the caller must be signed in so we can pull their saved
 * ailments without exposing them to guest traffic. Guests hit the
 * rate-limited fallback in `clientIp`/`guestRateLimit` instead.
 * The client already gates the page behind the local age gate, so the
 * callable trusts the caller's auth without re-checking any custom claim.
 */
export const describeStrainForUser = onCall(
  AI_OPTIONS,
  async (request): Promise<StrainDescriptionResult> => {
    if (!request.auth) {
      try {
        guestRateLimit(clientIp(request));
      } catch (err) {
        throw new HttpsError(
          "resource-exhausted",
          err instanceof Error ? err.message : "Too many guest searches.",
        );
      }
    }

    const data = (request.data ?? {}) as {
      strain?: unknown;
      ailments?: unknown;
      medications?: unknown;
      reliefHistory?: unknown;
      language?: unknown;
    };
    const strain = (data.strain ?? {}) as StrainProfile;
    const name =
      typeof strain.name === "string" && strain.name.trim()
        ? strain.name.trim().slice(0, 120)
        : "";
    if (name === "") {
      throw new HttpsError("invalid-argument", "Provide a strain to describe.");
    }
    // Trim ailments to a sensible cap (matches the Firestore write cap
    // in iOS/web) so a malicious caller can't blow up the prompt.
    const ailments = asStringArray(data.ailments)
      .map((a) => a.trim())
      .filter((a) => a !== "")
      .slice(0, 16);
    // Medications come in as a string[] (one per saved med). Cap them
    // and clamp each entry so a long name can't bloat the prompt.
    const medications = asStringArray(data.medications)
      .map((m) => m.trim().slice(0, 80))
      .filter((m) => m !== "")
      .slice(0, 24);
    // Relief history is already a short prose summary on the client.
    // Trim and clamp it explicitly so a malicious caller can't pass a
    // 100k-char blob.
    const reliefHistory =
      typeof data.reliefHistory === "string"
        ? data.reliefHistory.trim().slice(0, 800)
        : "";
    const language = parseOutputLanguage(data.language);
    const safeStrain: StrainProfile = { ...strain, name };

    const content = await callGroq(GROQ_API_KEY.value(), [
      {
        role: "system",
        content: withLanguageClause(DESCRIBE_SYSTEM_PROMPT, language),
      },
      {
        role: "user",
        content: describePrompt(safeStrain, ailments, medications, reliefHistory),
      },
    ]);

    return parseDescription(content, name);
  },
);

/**
 * Response shape for `elaborateSection`. A single short prose string
 * (2-4 short paragraphs separated by a blank line).
 */
type ElaborateSectionResult = {
  elaboration: string;
};

/**
 * Pull the elaboration text out of a Groq response. The model is
 * expected to return a single JSON object with one `elaboration` field.
 * We tolerate a few failure modes the same way `parseDescription`
 * does: a string body, an unparseable blob, or a missing field. When
 * anything goes wrong we hand back a one-paragraph safe fallback so
 * the web client never renders an empty elaboration card.
 */
function parseElaboration(
  content: string,
  fallbackName: string,
  heading: string,
): ElaborateSectionResult {
  // First try the structured path — model returns
  // `{ "elaboration": "..." }`.
  const obj = extractJsonObject(content) as { elaboration?: unknown } | null;
  if (obj && typeof obj.elaboration === "string") {
    const text = obj.elaboration.trim();
    if (text.length > 0) return { elaboration: text };
  }
  // Fall back to treating the whole body as the elaboration. The model
  // sometimes returns a bare string instead of a JSON object, especially
  // for the smaller elaboration surface.
  const fallback = content.trim();
  if (fallback.length > 0 && fallback.length <= 4000) {
    return { elaboration: fallback };
  }
  return {
    elaboration: `We don't have an expanded take for ${fallbackName} on "${heading}" right now. Tap again in a moment.`,
  };
}

/**
 * Build the user-message prompt for `elaborateSection`. Mirrors the
 * structure of `describePrompt` so the model has the same context
 * (ailments, medications, relief log, language) but asks it to focus
 * on a single section.
 */
function elaborateSectionPrompt(
  strain: StrainProfile,
  sectionHeading: string,
  sectionBody: string,
  ailments: string[],
  medications: string[],
  reliefHistory: string,
): string {
  const payload = describeStrainPayload(strain);
  const contextLines: string[] = [];
  contextLines.push(
    ailments.length > 0
      ? `Patient's saved ailments (fold them into the elaboration where relevant): ${ailments.join(", ")}`
      : "Patient's saved ailments: none — write a general expansion.",
  );
  contextLines.push(
    medications.length > 0
      ? `Patient's current medications (mention a specific drug only when there is a commonly cited cannabis interaction — always phrase as "ask your clinician about combining with X", never advise stopping): ${medications.join(", ")}`
      : "Patient's current medications: none reported.",
  );
  contextLines.push(
    reliefHistory.trim().length > 0
      ? `Recent relief-log history (newest first; use to calibrate tone and depth — the patient has logged how previous strains went for similar symptoms):\n${reliefHistory}`
      : "Recent relief-log history: none — write without calibrating to past sessions.",
  );
  return [
    `Strain data (JSON):`,
    compactJson(payload),
    ``,
    `Section to expand:`,
    `Heading: ${sectionHeading}`,
    `Current body (do NOT contradict — this is what the patient already sees):`,
    sectionBody,
    ``,
    contextLines.join("\n"),
    ``,
    `Write a short elaboration that goes deeper on this section's focus. Keep it 2-4 short paragraphs, separated by a single blank line.`,
  ].join("\n");
}

/**
 * Ask the AI to elaborate on a single section of a strain's tailored
 * description. Wired to the ✨ Ask Maya button on the web strain page.
 * Auth-gated: the caller must be signed in so we can pull their saved
 * ailments without exposing them to guest traffic. Guests hit the
 * rate-limited fallback in `clientIp`/`guestRateLimit` instead.
 * The client already gates the page behind the local age gate, so the
 * callable trusts the caller's auth without re-checking any custom claim.
 */
export const elaborateSection = onCall(
  AI_OPTIONS,
  async (request): Promise<ElaborateSectionResult> => {
    if (!request.auth) {
      try {
        guestRateLimit(clientIp(request));
      } catch (err) {
        throw new HttpsError(
          "resource-exhausted",
          err instanceof Error ? err.message : "Too many guest searches.",
        );
      }
    }

    const data = (request.data ?? {}) as {
      strain?: unknown;
      sectionHeading?: unknown;
      sectionBody?: unknown;
      ailments?: unknown;
      medications?: unknown;
      reliefHistory?: unknown;
      language?: unknown;
    };
    const strain = (data.strain ?? {}) as StrainProfile;
    const name =
      typeof strain.name === "string" && strain.name.trim()
        ? strain.name.trim().slice(0, 120)
        : "";
    if (name === "") {
      throw new HttpsError("invalid-argument", "Provide a strain to describe.");
    }
    const heading =
      typeof data.sectionHeading === "string" && data.sectionHeading.trim()
        ? data.sectionHeading.trim().slice(0, 80)
        : "";
    if (heading === "") {
      throw new HttpsError("invalid-argument", "Provide a section heading.");
    }
    const body =
      typeof data.sectionBody === "string"
        ? data.sectionBody.trim().slice(0, 2000)
        : "";
    // Cap everything to the same lengths the rest of the describe
    // surface uses so a malicious caller can't blow up the prompt.
    const ailments = asStringArray(data.ailments)
      .map((a) => a.trim())
      .filter((a) => a !== "")
      .slice(0, 16);
    const medications = asStringArray(data.medications)
      .map((m) => m.trim().slice(0, 80))
      .filter((m) => m !== "")
      .slice(0, 24);
    const reliefHistory =
      typeof data.reliefHistory === "string"
        ? data.reliefHistory.trim().slice(0, 800)
        : "";
    const language = parseOutputLanguage(data.language);
    const safeStrain: StrainProfile = { ...strain, name };

    const content = await callGroq(GROQ_API_KEY.value(), [
      {
        role: "system",
        content: withLanguageClause(
          ELABORATE_SECTION_SYSTEM_PROMPT,
          language,
        ),
      },
      {
        role: "user",
        content: elaborateSectionPrompt(
          safeStrain,
          heading,
          body,
          ailments,
          medications,
          reliefHistory,
        ),
      },
    ]);

    return parseElaboration(content, name, heading);
  },
);

/* ── Background jobs ──────────────────────────────────────────────── */

export { redditCacheRefresh } from "./reddit-refresh";

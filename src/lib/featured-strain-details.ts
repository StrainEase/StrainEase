import type { StrainDescription } from "@/lib/strain-api";
import type {
  CommunityNote,
  RedditSource,
  StrainProfile,
} from "@/lib/strain-profile";

/**
 * Preloaded detail data for the six strains pinned to the home rail.
 *
 * Clicking one of these from `HOME_FEATURED_STRAINS` skips both
 * `searchStrain()` (Leafly scrape) and `describeStrainForUser()`
 * (MiniMax call) and renders straight from this map. The shape
 * mirrors what a logged-in user with saved ailments would see on
 * the live `/strain/:slug` page:
 *
 *   - StrainProfile with terpenes, effects, side effects, lineage,
 *     Leafly rating, community quotes, and a static `description`
 *     that fills the un-tailored fallback in StrainDetailCard.
 *   - StrainDescription with the three sections the AI callable
 *     normally returns (Overview / What it might do for you /
 *     What to expect).
 *
 * Keep the data in this file in sync with the names in
 * `HOME_FEATURED_NAMES` in strain-catalog.ts.
 */

type FeaturedDetail = {
  profile: StrainProfile;
  tailored: StrainDescription;
};

// ---- helpers --------------------------------------------------------------

const redditSource = (
  subreddit: string,
  title: string,
  snippet: string,
  score: number,
): RedditSource => ({
  url: `https://old.reddit.com/r/${subreddit}/comments/_search/${encodeURIComponent(title)}/`,
  subreddit,
  title,
  snippet,
  score,
});

// ---- shared community quotes ---------------------------------------------

// Curated Leafly + Reddit quotes per strain. The CommunityVoices tab reads
// `source` to decide cannabis vs reddit channels, so keep "Reddit" in the
// source string for any patient comment we want surfaced under the Reddit tab.
const LEAFLY_REVIEW = (strain: string, text: string): CommunityNote => ({
  source: "Leafly review",
  text,
  kind: "leafly",
});
const REDDIT_QUOTE = (sub: string, text: string): CommunityNote => ({
  source: `r/${sub}`,
  text,
  kind: "reddit",
});

// ---- per-strain mock profiles --------------------------------------------

const BLUE_DREAM: FeaturedDetail = {
  profile: {
    name: "Blue Dream",
    inKnowledgeBase: true,
    type: "hybrid",
    thcRange: "17–24%",
    cbdRange: "<1%",
    lineage: "Blueberry × Haze",
    description:
      "A sativa-leaning hybrid out of California that's become the country's most-searched strain. Sweet berry aroma on the inhale, light herbal finish — gentle cerebral lift paired with a soft body ease that keeps most patients functional.",
    terpenes: [
      { name: "Myrcene", profile: "herbal, clove" },
      { name: "Pinene", profile: "pine, fresh" },
      { name: "Caryophyllene", profile: "pepper, spice" },
    ],
    effects: [
      { name: "Relaxed", intensity: 4 },
      { name: "Happy", intensity: 4 },
      { name: "Uplifted", intensity: 3 },
      { name: "Creative", intensity: 3 },
      { name: "Euphoric", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Mild paranoia at higher doses"],
    medicalUses: [
      "Chronic pain",
      "Depression",
      "Stress",
      "Fatigue",
      "Inflammation",
      "Arthritis",
    ],
    leaflyRating: 4.5,
    leaflyReviewCount: 13_240,
    communityNotes: [
      LEAFLY_REVIEW(
        "Blue Dream",
        "Daytime relief without the couch-lock. Took the edge off my nerve pain without slowing me down at work.",
      ),
      LEAFLY_REVIEW(
        "Blue Dream",
        "Reliable mood lift — depression stays manageable for a few hours after a small bowl.",
      ),
      REDDIT_QUOTE(
        "chronicpain",
        "Blue Dream is my go-to for days when my back is acting up but I still need to function. Pain drops to a 3/10 without the heavy sedation of an indica.",
      ),
    ],
    redditSources: [
      redditSource(
        "chronicpain",
        "Blue Dream for daytime pain — anyone else use it as a daily driver?",
        "Daytime pain relief without sedation is exactly what I need.",
        184,
      ),
    ],
  },
  tailored: {
    sections: [
      {
        heading: "Overview",
        body: "Blue Dream is a balanced hybrid with a reputation for being friendly to first-time and daily medical patients alike. The Myrcene-dominant terpene profile leans gentle — most people describe it as a soft cerebral lift that settles into the body without weighing it down.\n\nIf you've been avoiding flower because it makes you anxious or sleepy, Blue Dream is often the first strain people come back to. The CBD share is small (<1%) so the effect is clearly THC-led, but the Pinene and Caryophyllene round the edges enough that higher doses don't tip into paranoia for most patients.",
      },
      {
        heading: "What it might do for you",
        body: "Reported benefits cluster around chronic pain, depression, and stress — the three Leafly-listed uses patients most often confirm in reviews.\n\nFor pain specifically, Blue Dream is most useful when you need relief but still need to function. Think flares that would normally cancel a workday, or a morning when arthritis makes getting out of bed harder than it should be.\n\nIf your main concern is mood, the lift is real but it's not bouncy. Expect a steady uplifted feeling rather than a jolt.",
      },
      {
        heading: "What to expect",
        body: "Onset is typical for inhaled flower — a few minutes to feel it, plateau around 30 minutes, gradual taper over two to three hours. Dry mouth is the most-reported side effect; keep water nearby.\n\nStart low if you're THC-sensitive. A single small bowl is enough for most beginners. Patients on SSRIs or other psychiatric meds should treat it like any THC product — start low, go slow, and watch for anxiety spikes.",
      },
    ],
  },
};

const GRANDDADDY_PURPLE: FeaturedDetail = {
  profile: {
    name: "Granddaddy Purple",
    inKnowledgeBase: true,
    type: "indica",
    thcRange: "17–23%",
    cbdRange: "<1%",
    lineage: "Purple Urkle × Big Bud",
    description:
      "A flagship California indica — grape and berry on the nose, deep purple buds, and a heavy body stone that earns its reputation as a nighttime strain. Best reserved for when the day is done.",
    terpenes: [
      { name: "Myrcene", profile: "herbal, grape" },
      { name: "Caryophyllene", profile: "pepper, spice" },
      { name: "Pinene", profile: "pine, fresh" },
    ],
    effects: [
      { name: "Relaxed", intensity: 5 },
      { name: "Sleepy", intensity: 4 },
      { name: "Hungry", intensity: 3 },
      { name: "Euphoric", intensity: 3 },
      { name: "Happy", intensity: 2 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Couch-lock at higher doses"],
    medicalUses: [
      "Insomnia",
      "Chronic pain",
      "Muscle spasm",
      "Stress",
      "PTSD",
      "Anxiety",
    ],
    leaflyRating: 4.6,
    leaflyReviewCount: 10_410,
    communityNotes: [
      LEAFLY_REVIEW(
        "Granddaddy Purple",
        "The only thing that gets me to sleep on bad PTSD nights. Within an hour my body lets go of the tension it's been holding all day.",
      ),
      LEAFLY_REVIEW(
        "Granddaddy Purple",
        "Beautiful purple nugs, grape candy smell. Heavy — I only use it on weekends when I have nowhere to be.",
      ),
      REDDIT_QUOTE(
        "insomnia",
        "Two hits of GDP and I'm asleep in 30 minutes. Nothing else in my rotation has been as consistent.",
      ),
    ],
    redditSources: [
      redditSource(
        "insomnia",
        "Granddaddy Purple for sleep — what's your dose?",
        "Two hits and I'm out within 30 minutes. Most consistent sleep strain I've tried.",
        142,
      ),
    ],
  },
  tailored: {
    sections: [
      {
        heading: "Overview",
        body: "Granddaddy Purple (GDP) is one of the most recognized indica names on dispensary shelves. The grape-and-berry terpene profile is distinctive — if you smell a jar and it reminds you of candy, it's almost certainly this lineage.\n\nIt's a heavy strain. The THC ceiling (around 23%) is moderate by modern standards, but the body stone is what patients remember. Plan the evening around it.",
      },
      {
        heading: "What it might do for you",
        body: "Insomnia is the use case GDP is most famous for. Patients with PTSD, restless legs, or chronic pain that flares at night tend to rate it highly because the relaxation extends past the head into the limbs.\n\nIt's less useful for daytime symptom control — most people report a clear sedation that makes working, driving, or socializing difficult within an hour of dosing. If your main need is evening pain relief that doubles as a sleep aid, GDP is a strong pick.",
      },
      {
        heading: "What to expect",
        body: "Effects come on slowly and linger. Plan a 6–8 hour window before anything that requires full alertness.\n\nDry mouth is universal. The hunger effect is real and useful for patients dealing with appetite loss — keep snacks on hand.\n\nIf you're on sleep aids or sedating medications, talk to your doctor before combining. The combination can be more than additive.",
      },
    ],
  },
};

const SOUR_DIESEL: FeaturedDetail = {
  profile: {
    name: "Sour Diesel",
    inKnowledgeBase: true,
    type: "sativa",
    thcRange: "19–24%",
    cbdRange: "<1%",
    lineage: "Chemdawg × Super Skunk",
    description:
      "A landmark East Coast sativa — pungent diesel and citrus aroma, fast cerebral onset, and a long, talkative high. The strain most veteran patients reach for when they need to be awake and engaged.",
    terpenes: [
      { name: "Limonene", profile: "lemon, citrus" },
      { name: "Caryophyllene", profile: "pepper, diesel" },
      { name: "Myrcene", profile: "herbal, skunk" },
    ],
    effects: [
      { name: "Energetic", intensity: 4 },
      { name: "Uplifted", intensity: 4 },
      { name: "Happy", intensity: 3 },
      { name: "Focused", intensity: 3 },
      { name: "Creative", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Anxiety in sensitive patients"],
    medicalUses: [
      "ADHD",
      "Stress",
      "Depression",
      "Chronic pain",
      "Fatigue",
      "Migraine",
    ],
    leaflyRating: 4.5,
    leaflyReviewCount: 9_180,
    communityNotes: [
      LEAFLY_REVIEW(
        "Sour Diesel",
        "My morning strain. Hits fast, clears the fog, and I can actually get work done. The diesel smell is unmistakable.",
      ),
      LEAFLY_REVIEW(
        "Sour Diesel",
        "Best for migraines before they lock in. If I catch one early I can knock it back with a small bowl.",
      ),
      REDDIT_QUOTE(
        "ADHD",
        "Sour Diesel is the only strain that gives me clean focus without the jittery feeling. An hour of actual deep work instead of tab-switching.",
      ),
    ],
    redditSources: [
      redditSource(
        "ADHD",
        "Sour Diesel for focus — anyone else using it as a productivity tool?",
        "Clean focus without the jitters. Real deep-work hours instead of tab-switching.",
        156,
      ),
    ],
  },
  tailored: {
    sections: [
      {
        heading: "Overview",
        body: "Sour Diesel (or \"Sour D\") is a sativa that defines what people mean when they say \"head high.\" The Limonene-dominant terpene profile gives it a sharp citrus-diesel smell that most patients either love or find overwhelming.\n\nEffects come on within minutes — this is one of the faster-onset sativas on the market. The high is cerebral, energetic, and lasts longer than most sativas (often 3+ hours).",
      },
      {
        heading: "What it might do for you",
        body: "ADHD, fatigue, and depression are the symptoms most often improved in patient reviews. The focus boost is real but not stimulant-like — patients describe it as \"the resistance to starting a task disappears.\"\n\nFor migraines, timing matters. Patients report best results catching the migraine early — once it's locked in, even Sour Diesel won't undo it.",
      },
      {
        heading: "What to expect",
        body: "Fast onset, strong cerebral effects, possible heart rate increase in the first 30 minutes. If you're anxiety-prone, start with one small hit and wait — this strain amplifies existing anxiety in some patients.\n\nThe diesel aroma lingers. Plan around that.\n\nIt can suppress appetite rather than stimulate it, which makes it useful for patients who don't want the munchies effect but not ideal for those treating appetite loss.",
      },
    ],
  },
};

const JACK_HERER: FeaturedDetail = {
  profile: {
    name: "Jack Herer",
    inKnowledgeBase: true,
    type: "sativa",
    thcRange: "18–23%",
    cbdRange: "<1%",
    lineage: "Haze × (Northern Lights #5 × Shiva Skunk)",
    description:
      "A Dutch classic named after the cannabis-activist author. Clear-headed, focused, award-winning sativa — the strain people reach for when they want to think, not check out.",
    terpenes: [
      { name: "Terpinolene", profile: "herbal, floral" },
      { name: "Pinene", profile: "pine, fresh" },
      { name: "Caryophyllene", profile: "pepper, spice" },
    ],
    effects: [
      { name: "Focused", intensity: 4 },
      { name: "Creative", intensity: 4 },
      { name: "Uplifted", intensity: 3 },
      { name: "Happy", intensity: 3 },
      { name: "Energetic", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Mild anxiety in sensitive patients"],
    medicalUses: ["ADHD", "Fatigue", "Depression", "Stress", "Inflammation", "Migraine"],
    leaflyRating: 4.5,
    leaflyReviewCount: 7_320,
    communityNotes: [
      LEAFLY_REVIEW(
        "Jack Herer",
        "The thinking strain. I write my best work on it — clear-headed without the racing heart of Sour Diesel.",
      ),
      LEAFLY_REVIEW(
        "Jack Herer",
        "Good for ADHD mornings. Helps me prioritize instead of bouncing between tasks.",
      ),
      REDDIT_QUOTE(
        "Anxiety",
        "Jack Herer is the only sativa that doesn't spike my anxiety. Calm focus. Genuinely useable as a daytime med.",
      ),
    ],
    redditSources: [
      redditSource(
        "ADHD",
        "Jack Herer vs Sour Diesel for focus?",
        "Jack Herer is cleaner. Less heart-racing, more even focus.",
        121,
      ),
    ],
  },
  tailored: {
    sections: [
      {
        heading: "Overview",
        body: "Jack Herer is the sativa most often recommended when a patient says \"I want to think, not get high.\" The Terpinolene-dominant terpene profile gives it an herbal-floral aroma that's noticeably different from the diesel or citrus notes most sativas lean on.\n\nIt's won multiple Cannabis Cup awards for a reason — the high is functional, clear, and long-lasting.",
      },
      {
        heading: "What it might do for you",
        body: "ADHD and depression top the patient-reported list. Unlike stimulant medications, Jack Herer doesn't force focus — it removes the friction around starting tasks and staying on them.\n\nFor patients with anxiety who can't tolerate most sativas, Jack Herer is often the exception. The lack of Limonene-heavy citrus notes seems to make it easier on patients who find Sour Diesel too edge-amping.",
      },
      {
        heading: "What to expect",
        body: "Onset is moderate — 10–15 minutes to feel it, plateau around the 45-minute mark. Effects taper gradually over 2–3 hours.\n\nDry mouth is the most common side effect. Paranoia is rare but possible at higher doses.\n\nIt's not a sleep aid and not a couch-lock strain. If you dose late in the evening, expect to still be alert 3–4 hours later.",
      },
    ],
  },
};

const GELATO: FeaturedDetail = {
  profile: {
    name: "Gelato",
    inKnowledgeBase: true,
    type: "hybrid",
    thcRange: "20–25%",
    cbdRange: "<1%",
    lineage: "Sunset Sherbet × Thin Mint Girl Scout Cookies",
    description:
      "A modern dessert-strain hybrid out of the Bay Area. Sweet, creamy aroma; balanced, slightly indica-leaning high; and one of the highest terpene concentrations on the market.",
    terpenes: [
      { name: "Limonene", profile: "lemon, citrus" },
      { name: "Caryophyllene", profile: "pepper, spice" },
      { name: "Linalool", profile: "floral, lavender" },
    ],
    effects: [
      { name: "Relaxed", intensity: 4 },
      { name: "Happy", intensity: 4 },
      { name: "Euphoric", intensity: 3 },
      { name: "Uplifted", intensity: 3 },
      { name: "Creative", intensity: 2 },
    ],
    sideEffects: [
      "Dry mouth",
      "Dry eyes",
      "Couch-lock at higher doses",
    ],
    medicalUses: ["Stress", "Anxiety", "Depression", "PTSD", "Nausea & appetite"],
    leaflyRating: 4.6,
    leaflyReviewCount: 8_140,
    communityNotes: [
      LEAFLY_REVIEW(
        "Gelato",
        "Strong but balanced. Mood lifts quickly and the body relaxation sneaks up on you — perfect for evenings when pain is creeping in.",
      ),
      LEAFLY_REVIEW(
        "Gelato",
        "Best dessert strain for PTSD evenings. Calms the noise without flattening me.",
      ),
      REDDIT_QUOTE(
        "Anxiety",
        "Gelato is my evening anxiety med. Lifts the mood, lets the tension out, and I still sleep normally.",
      ),
    ],
    redditSources: [
      redditSource(
        "Anxiety",
        "Gelato as an evening anxiety strain?",
        "Lifts the mood without flattening. I still sleep, which is the win.",
        98,
      ),
    ],
  },
  tailored: {
    sections: [
      {
        heading: "Overview",
        body: "Gelato (sometimes called \"Larry Bird\" in older cuts) is a slightly indica-leaning hybrid famous for two things: its dessert-sweet aroma and its high THC ceiling. Most cuts test between 20–25%.\n\nThe Linalool content is unusually high for a popular commercial strain — that's the terpene most associated with calming, slightly sedative effects. It's what gives Gelato its evening-friendlier reputation compared to other hybrids at the same THC level.",
      },
      {
        heading: "What it might do for you",
        body: "Stress, anxiety, and PTSD are the symptoms where Gelato consistently outperforms in patient reviews. The high is mood-lifting and body-relaxing without crossing into full sedation at normal doses.\n\nFor pain it's useful but not as targeted as a pure indica. Think more \"I want to feel less wound up\" than \"I need pain control to function.\"\n\nIf appetite is part of your picture, expect a gentle hunger effect about 90 minutes in — useful, not overwhelming.",
      },
      {
        heading: "What to expect",
        body: "Onset is fast — 5–10 minutes. The high is a slow build, with body relaxation arriving 30–45 minutes in. Total duration is 2–3 hours.\n\nAt moderate doses the effect is functional enough for low-key evening activities. At higher doses expect couch-lock, so plan accordingly.\n\nThe THC ceiling is high. If you're sensitive, start with one hit and wait.",
      },
    ],
  },
};

const NORTHERN_LIGHTS: FeaturedDetail = {
  profile: {
    name: "Northern Lights",
    inKnowledgeBase: true,
    type: "indica",
    thcRange: "16–21%",
    cbdRange: "<1%",
    lineage: "Afghani × Thai",
    description:
      "A pure indica legend — earthy, pine aroma, fast body stone, and the most-cited sleep strain in patient surveys. The baseline against which other indicas get compared.",
    terpenes: [
      { name: "Myrcene", profile: "herbal, earthy" },
      { name: "Caryophyllene", profile: "pepper, spice" },
      { name: "Pinene", profile: "pine, fresh" },
    ],
    effects: [
      { name: "Relaxed", intensity: 5 },
      { name: "Sleepy", intensity: 5 },
      { name: "Happy", intensity: 3 },
      { name: "Euphoric", intensity: 3 },
      { name: "Hungry", intensity: 2 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Couch-lock"],
    medicalUses: [
      "Insomnia",
      "Chronic pain",
      "Stress",
      "Anxiety",
      "PTSD",
      "Inflammation",
    ],
    leaflyRating: 4.7,
    leaflyReviewCount: 11_980,
    communityNotes: [
      LEAFLY_REVIEW(
        "Northern Lights",
        "The original. Reliable, heavy, and gone by morning. I've used it for insomnia for fifteen years.",
      ),
      LEAFLY_REVIEW(
        "Northern Lights",
        "Pain disappears within fifteen minutes. Sleep comes within an hour.",
      ),
      REDDIT_QUOTE(
        "insomnia",
        "Northern Lights is the strain I recommend to anyone with chronic insomnia. It's not flashy, it just works.",
      ),
    ],
    redditSources: [
      redditSource(
        "insomnia",
        "Why does Northern Lights still work after all these years?",
        "It's not flashy. It just works, year after year.",
        167,
      ),
    ],
  },
  tailored: {
    sections: [
      {
        heading: "Overview",
        body: "Northern Lights is the reference indica — the strain other indicas are compared against. It comes out of late-1970s Pacific Northwest breeding (Afghani × Thai) and has been a Dutch coffee-shop staple since the 1980s.\n\nThe aroma is earthy and pine-heavy, not sweet. Patients who want candy or fruit notes usually reach for something else.",
      },
      {
        heading: "What it might do for you",
        body: "Insomnia, chronic pain, and PTSD-driven sleep disruption are the symptoms Northern Lights is most often praised for. The Myrcene content is on the high side, which is why the body relaxation is so pronounced.\n\nFor anxiety, it works through sedation more than through direct anxiolytic effect — meaning it calms you by removing the energy that fuels anxiety, not by addressing the thought patterns directly.\n\nIt's not a daytime strain for almost anyone. Plan around it.",
      },
      {
        heading: "What to expect",
        body: "Onset is fast for an indica — within 10 minutes you feel the body drop. Sleep follows for most patients within 60–90 minutes.\n\nDry mouth is universal. The hunger effect kicks in around the 90-minute mark.\n\nIf you're on benzodiazepines, sleep aids, or muscle relaxants, the combination can be more than additive. Talk to your prescriber before stacking.",
      },
    ],
  },
};

// ---- public registry ------------------------------------------------------

const DETAILS: Record<string, FeaturedDetail> = {
  "blue-dream": BLUE_DREAM,
  "granddaddy-purple": GRANDDADDY_PURPLE,
  "sour-diesel": SOUR_DIESEL,
  "jack-herer": JACK_HERER,
  gelato: GELATO,
  "northern-lights": NORTHERN_LIGHTS,
};

/** True when a featured rail strain has preloaded detail data on file. */
export function isFeaturedStrainSlug(slug: string): boolean {
  return slug in DETAILS;
}

/** Full mock profile for the strain page. Undefined for non-featured slugs. */
export function getFeaturedStrainProfile(slug: string): StrainProfile | undefined {
  return DETAILS[slug]?.profile;
}

/**
 * Three-section tailored description, mirroring the payload the
 * `describeStrainForUser` callable would return for a logged-in user.
 * Used by `useTailoredDescription` to skip the API call for featured strains.
 */
export function getFeaturedTailoredDescription(
  slug: string,
): StrainDescription | undefined {
  return DETAILS[slug]?.tailored;
}
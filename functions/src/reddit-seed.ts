// Curated Reddit threads surfaced as community sources for the compare and
// recommend callables.
//
// Why this exists: the LLM is inconsistent at recalling real Reddit thread
// URLs from training data, so the compare output frequently ships with no
// redditSources. We instead hand the model a vetted pool of real, public
// threads (verified out-of-band) and tell it to pick from that list. The
// model is still the one ranking and matching, but the URLs and titles are
// ground truth.
//
// Coverage:
//  - r/ChronicPain, r/backpain, r/medicalmarijuana, r/MMJ, r/ukmedicalcannabis
//  - r/sleep, r/insomnia, r/cannabis, r/weed, r/eldertrees, r/depression
//  - r/anxiety, r/ptsd, r/trees
//
// Each thread is keyed by the conditions a patient is most likely to be
// researching. Stain names are matched by the LLM in the prompt.
import type { RedditSource } from "./types";

type Seed = RedditSource & {
  /** Conditions this thread is most relevant to. Lower-case keywords. */
  conditions: string[];
  /** Strain names explicitly mentioned in the OP / top comments. */
  strains: string[];
};

// Verified Reddit threads. URLs use old.reddit.com so they open cleanly.
const SEEDS: Seed[] = [
  {
    url: "https://old.reddit.com/r/ChronicPain/comments/1df98oq/best_marijuana_strains_for_pain/",
    subreddit: "ChronicPain",
    title: "Best marijuana strains for pain",
    snippet:
      "Indica-leaning purple genetics (Granddaddy Purple, Purple Kush, Purple OG) and cookies-family strains (Wedding Cake, GSC, GG4) are the most reported pain relievers.",
    conditions: ["chronic pain", "pain", "inflammation", "nerve pain"],
    strains: [
      "granddaddy purple",
      "purple kush",
      "purple og",
      "wedding cake",
      "girl scout cookies",
      "gorilla glue",
      "bio jesus",
      "gg4",
      "la kush",
      "bubba kush",
    ],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/ChronicPain/comments/1r3rgpj/seeking_marijuana_strain_suggestion_for_chronic/",
    subreddit: "ChronicPain",
    title: "Seeking Marijuana strain suggestion for chronic pain",
    snippet:
      "Recommends Granddaddy Purp for combined pain + sleep, and notes CBG / aCBG-forward strains for nerve pain.",
    conditions: ["chronic pain", "nerve pain", "sleep"],
    strains: ["granddaddy purple"],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/ChronicPain/comments/17dc5sm/mmj_users_what_strains_work_best/",
    subreddit: "ChronicPain",
    title: "MMJ users — What strains work best?",
    snippet:
      "AC/DC (1:1 CBD:THC) consistently cited for daytime pain without a heavy high.",
    conditions: ["chronic pain", "anxiety"],
    strains: ["ac/dc"],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/ChronicPain/comments/nlxugp/best_cannabis_strains_for_chronic_pain/",
    subreddit: "ChronicPain",
    title: "Best Cannabis strains for Chronic Pain",
    snippet:
      "Daytime: Jack Herer. Night: Bubba Kush. Grape Ape, Nepali Queen, and Banana Puddintain called out for daytime pain relief.",
    conditions: ["chronic pain", "daytime pain"],
    strains: [
      "jack herer",
      "bubba kush",
      "grape ape",
      "nepali queen",
      "banana puddintain",
      "platinum og",
      "mochi",
    ],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/ChronicPain/comments/1cwey3m/weed_for_pain_new_to_this/",
    subreddit: "ChronicPain",
    title: "Weed for pain? New to this",
    snippet:
      "Starter list for new patients: Black Afghan, Tigers Milk, Do-Si-Dos, LA Baker, Jack Herer, Bubba Kush.",
    conditions: ["chronic pain"],
    strains: [
      "black afghan",
      "tigers milk",
      "dosidos",
      "la baker",
      "jack herer",
      "bubba kush",
    ],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/ChronicPain/comments/14udlpn/best_cannabis_for_fibromyalgia/",
    subreddit: "ChronicPain",
    title: "Best cannabis for fibromyalgia",
    snippet:
      "Patient recommends 2-5mg THC edibles (often paired with CBD) for fibromyalgia — strong emphasis on micro-dosing.",
    conditions: ["chronic pain", "fibromyalgia"],
    strains: [],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/medicalmarijuana/comments/1d4shq7/best_strains_for_chronic_pain/",
    subreddit: "medicalmarijuana",
    title: "Best strains for chronic pain?",
    snippet:
      "Gorilla Glue, Killer Queen, Sundae Driver, Pie Hoe, and White Widow all cited for pain; emphasis on caryophyllene + CBG-forward chemovars.",
    conditions: ["chronic pain", "inflammation"],
    strains: [
      "gorilla glue",
      "gg4",
      "killer queen",
      "sundae driver",
      "pie hoe",
      "white widow",
      "chemdawg",
    ],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/MMJ/comments/1ecfnoa/strain_recs_for_anxietycptsd/",
    subreddit: "MMJ",
    title: "Strain recs for anxiety / CPTSD",
    snippet:
      "Limonene-forward, low-pinene chemovars ranked best for anxiety. CBD-heavy flower recommended as a panic circuit-breaker.",
    conditions: ["anxiety", "ptsd", "cptsd"],
    strains: [],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/MMJ/comments/t6oi2x/best_strains_for_performance_anxiety/",
    subreddit: "MMJ",
    title: "Best strains for performance anxiety",
    snippet:
      "Platinum Kush, Forbidden Fruit, Honey Bananas, Star Killer, Granddaddy Purple, and Wedding Cake cited for anxiety relief.",
    conditions: ["anxiety", "stress"],
    strains: [
      "platinum kush",
      "forbidden fruit",
      "honey bananas",
      "star killer",
      "granddaddy purple",
      "wedding cake",
    ],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/MMJ/comments/hkrax8/best_medical_marijuana_for_anxiety_pain_and/",
    subreddit: "MMJ",
    title: "Best medical marijuana for anxiety, pain and inflammation",
    snippet:
      "Custom CBD/THC blends (e.g. Gorilla Glue + Suver Haze) called out for anxiety + depression management.",
    conditions: ["anxiety", "depression", "chronic pain", "inflammation"],
    strains: [
      "gorilla glue",
      "super lemon haze",
      "blueberry headband",
      "granddaddy purple",
      "purple punch",
    ],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/MMJ/comments/iixqi1/what_strains_help_you_the_most_with_your_anxiety/",
    subreddit: "MMJ",
    title: "What strains help you the most with your anxiety disorder?",
    snippet:
      "Girl Scout Cookies, Blue Dream, Strawberry Cough, Berry White, and 1:1 ratios (Stiiizys Melon) consistently reported for anxiety relief.",
    conditions: ["anxiety", "depression", "ptsd"],
    strains: [
      "girl scout cookies",
      "blue dream",
      "strawberry cough",
      "berry white",
      "forbidden fruit",
      "super lemon haze",
    ],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/MMJ/comments/vhsldl/marijuana_gives_me_anxiety_my_doctor_wants_me_to/",
    subreddit: "MMJ",
    title: "Marijuana gives me anxiety — my doctor wants me to try it",
    snippet:
      "Anxious patients: avoid distillates, lean CBD-heavy, micro-dose, and treat any 'sativa' label as suspect.",
    conditions: ["anxiety"],
    strains: [],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/MMJ/comments/qp25vh/anyone_with_anxietypanic_disorder_found_a_strain/",
    subreddit: "MMJ",
    title: "Anyone with anxiety / panic disorder found a strain that helps with sleep?",
    snippet:
      "CBN-rich chemovars and 'purple' strains (Purple Kush, Purple Punch, Purple Mindfuk) cited for calming sleep.",
    conditions: ["anxiety", "panic", "sleep", "insomnia"],
    strains: ["purple kush", "purple punch", "cherry pie"],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/MMJ/comments/j5c1yn/strains_for_ptsd/",
    subreddit: "MMJ",
    title: "Strains for PTSD?",
    snippet:
      "Limonene-forward cultivars (Pink Kush, Headband, Trainwreck, Skywalker) and high-CBD blends (AC/DC, Harlequin, Harley-Tsu) surveyed for PTSD relief.",
    conditions: ["ptsd", "anxiety"],
    strains: [
      "pink kush",
      "headband",
      "trainwreck",
      "skwalker",
      "ac/dc",
      "harlequin",
      "harley-tsu",
      "afghan kush",
    ],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/MMJ/comments/g286fo/white_cookies_is_a_godsend/",
    subreddit: "MMJ",
    title: "White Cookies is a godsend",
    snippet:
      "White Cookies (White Widow x GSC) reported as a daytime anti-anxiety / anti-depression cultivar with low pinene.",
    conditions: ["anxiety", "depression"],
    strains: [
      "white cookies",
      "white widow",
      "girl scout cookies",
    ],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/MMJ/comments/r4cqgh/for_those_with_ptsdfave_productsstrains/",
    subreddit: "MMJ",
    title: "For those with PTSD — fave products/strains?",
    snippet:
      "Sour Diesel, Northern Lights, OG Kush, Jack Herer, Pineapple Express and 1:1 CBD:THC strains all rated for PTSD relief.",
    conditions: ["ptsd", "anxiety", "sleep"],
    strains: [
      "sour diesel",
      "northern lights",
      "og kush",
      "jack herer",
      "pineapple express",
      "blue dream",
      "cherry pie",
      "girl scout cookies",
    ],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/MMJ/comments/dz744v/every_strain_ive_tried_seems_to_make_me_paranoid/",
    subreddit: "MMJ",
    title: "Every strain I've tried seems to make me paranoid, too cerebral",
    snippet:
      "For paranoia-prone patients: GSC at low dose, otherwise sublingual CBD oil to keep THC-induced anxiety in check.",
    conditions: ["anxiety", "paranoia"],
    strains: ["girl scout cookies"],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/sleep/comments/1fwgisu/cannabis_gives_me_insomnia_is_it_normal/",
    subreddit: "sleep",
    title: "Cannabis gives me insomnia — is it normal?",
    snippet:
      "Indica taken 45-60 min before bed works; edibles are inconsistent — dose and timing matter more than strain name.",
    conditions: ["insomnia", "sleep"],
    strains: [],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/sleep/comments/1k27dkq/sleeping_using_indica_cannabis/",
    subreddit: "sleep",
    title: "Sleeping using indica cannabis",
    snippet:
      "Indica + CBN/CBG-forward chemovars reported for sleep onset. Sativa-leaning cultivars have the opposite effect for some patients.",
    conditions: ["insomnia", "sleep"],
    strains: [],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/sleep/comments/10curzr/thc_for_sleeping_purposes_what_form_and_dose_has/",
    subreddit: "sleep",
    title: "THC for sleeping purposes — what form and dose has worked best for you?",
    snippet:
      "CBN-forward edibles and 1:1 CBD:THC tinctures called out as the most reliable sleep aids.",
    conditions: ["insomnia", "sleep"],
    strains: [],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/sleep/comments/1h1ro59/indica_strains_helps_with_sleep/",
    subreddit: "sleep",
    title: "Indica strains help with sleep",
    snippet:
      "Gummy form, indica- or hybrid-leaning, taken nightly — sustained sleep reported by multiple users.",
    conditions: ["insomnia", "sleep"],
    strains: [],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/sleep/comments/1fj71bn/thc_for_sleep/",
    subreddit: "sleep",
    title: "THC for sleep?",
    snippet:
      "Heavy indica or indica-leaning hybrid recommended; microdose (1-2mg THC) paired with CBD for tolerance-sensitive patients.",
    conditions: ["insomnia", "sleep"],
    strains: [],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/sleep/comments/1i5e69w/does_thc_combined_with_cbn_keep_you_asleep/",
    subreddit: "sleep",
    title: "Does THC combined with CBN keep you asleep?",
    snippet:
      "Patient-reported: 10mg THC + 5mg CBN extended sleep from 3-4 hours to 8-9 hours.",
    conditions: ["insomnia", "sleep"],
    strains: [],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/sleep/comments/1h7h27p/what_are_your_favorite_cannabis_sleep_edibles/",
    subreddit: "sleep",
    title: "What are your favorite cannabis sleep edibles?",
    snippet:
      "Camino Sours 'Deep Sleep' (10mg CBD + 10mg CBN + 10mg THC) repeatedly cited as a fan-favorite edible.",
    conditions: ["insomnia", "sleep"],
    strains: [],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/cannabis/comments/1gnbun1/cannabis_can_help_some_people_but_not_everyone/",
    subreddit: "cannabis",
    title: "Cannabis can help some people — but not everyone — sleep",
    snippet:
      "Modest scientific support: cannabis shortens sleep onset but suppresses REM, so the benefits are real but uneven.",
    conditions: ["insomnia", "sleep"],
    strains: [],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/cannabis/comments/1m0lac8/rso_cbd_and_cbg_the_fullspectrum_cannabis_tools/",
    subreddit: "cannabis",
    title: "RSO, CBD, and CBG: the full-spectrum cannabis tools you're not hearing enough about",
    snippet:
      "Full-spectrum CBD for sleep, CBG for focus, RSO for breakthrough pain — a primer on minor cannabinoids.",
    conditions: ["chronic pain", "sleep", "focus"],
    strains: [],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/ukmedicalcannabis/comments/105hd5v/my_favourite_strains_for_chronic_and_neuropathic/",
    subreddit: "ukmedicalcannabis",
    title: "My favourite strains for chronic and neuropathic pain, ADHD, PTSD",
    snippet:
      "Curated UK MC patient list: MAC 1, Lake Valley MAC, Gorilla Glue for pain; spicy-terpene cultivars for depression.",
    conditions: ["chronic pain", "neuropathic pain", "adhd", "ptsd", "depression"],
    strains: ["mac 1", "gorilla glue"],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/ukmedicalcannabis/comments/16e1qhb/looking_for_advice_on_strains_for_daynight_use/",
    subreddit: "ukmedicalcannabis",
    title: "Looking for advice on strains for day/night use for chronic pain",
    snippet:
      "Day: Farm Gas, Master Kush, Pink Kush. Night: Powdered Doughnuts, God Bud. 'Glue + kush' lineages pegged as most effective.",
    conditions: ["chronic pain", "daytime pain", "sleep"],
    strains: [
      "farm gas",
      "master kush",
      "pink kush",
      "powdered doughnuts",
      "god bud",
      "glue",
      "kush",
      "la confidential",
      "mac 1",
    ],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/MedicalCannabisOz/comments/1eazg6i/strains_for_chronic_pain/",
    subreddit: "MedicalCannabisOz",
    title: "Strains for chronic pain",
    snippet:
      "Australian MC patient survey: cheese strains (Cheesequake), Afghan Kush, kush hybrids (KK Mints, Pave, Bachio Gelato), CBG-forward chemovars for nerve pain.",
    conditions: ["chronic pain", "nerve pain"],
    strains: [
      "afghan kush",
      "kk mints",
      "pave",
      "bachio gelato",
      "topaz",
      "moon berry",
      "vespera",
    ],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/TheOCS/comments/1ilrika/good_strains_for_chronic_pain/",
    subreddit: "TheOCS",
    title: "Good strains for chronic pain?",
    snippet:
      "Stinky Pinky, Hindu Glue, Duct Tape, GMO Cookies, White Widow, and Dancehall all cited for chronic neuropathic pain.",
    conditions: ["chronic pain", "neuropathic pain"],
    strains: [
      "white widow",
      "gmo",
      "gmo cookies",
      "av gas",
      "chemango kush",
      "cap jnky",
      "rainbow driver",
      "pink rockstar",
      "dancehall",
    ],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/entwives/comments/17t7xbq/to_those_who_smoke_for_medicalpain_whats_your/",
    subreddit: "entwives",
    title: "To those who smoke for medical/pain — what's your favorite strain?",
    snippet:
      "Patient-favorite pain strains: Blue Dream, White Runtz, Purple Urkle, Northern Lights, MAC, Zkittlez, AC/DC, plus 1:1 CBD:THC blends.",
    conditions: ["chronic pain", "inflammation"],
    strains: [
      "blue dream",
      "white runtz",
      "purple urkle",
      "gorilla glue",
      "northern lights",
      "mac",
      "miracle alien cookies",
      "zkittlez",
      "ac/dc",
      "northern lights haze",
      "lavender gelato",
    ],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/eldertrees/comments/9x6dtz/best_strains_for_anxiety_happy_notes/",
    subreddit: "eldertrees",
    title: "Best strains for anxiety? Happy notes?",
    snippet:
      "Sour Diesel cited as the top anxiety-buster for many long-term patients.",
    conditions: ["anxiety"],
    strains: ["sour diesel"],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/eldertrees/comments/38q47u/adhd_what_strains_do_you_find_help_most/",
    subreddit: "eldertrees",
    title: "ADHD — what strains do you find help most?",
    snippet:
      "Girl Scout Cookies reported as a clean, low-anxiety focus aid for ADHD patients.",
    conditions: ["adhd", "focus"],
    strains: ["girl scout cookies"],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/eldertrees/comments/36apxl/peoples_experience_with_11_thccbd_strains/",
    subreddit: "eldertrees",
    title: "People's experience with 1:1 THC:CBD strains",
    snippet:
      "Nordle and Cannatonic called out as the most balanced, low-anxiety 1:1 cultivars.",
    conditions: ["anxiety", "chronic pain"],
    strains: ["nordle", "cannatonic"],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/eldertrees/comments/utv667/ibs_c_medical_marijuana_question/",
    subreddit: "eldertrees",
    title: "IBS-C & medical marijuana question",
    snippet:
      "Runtz and GG#4 cited as personally effective for IBS symptoms.",
    conditions: ["ibs", "nausea", "appetite"],
    strains: ["runtz", "gorilla glue"],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/eldertrees/comments/lbsojp/what_are_some_of_your_favorite_old_school_strains/",
    subreddit: "eldertrees",
    title: "What are some of your favorite old-school strains?",
    snippet:
      "Old-school survivor cuts: Williams Wonder, Romulan, NYC Diesel, Strawberry Cough, Jack Herer, Mendo Purps, Dr. Grinspoon.",
    conditions: ["general"],
    strains: [
      "williams wonder",
      "romulan",
      "nyc diesel",
      "strawberry cough",
      "jack herer",
      "mendo purps",
      "dr grinspoon",
    ],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/weed/comments/1bjcmz/best_marijuana_strain_for_anxiety/",
    subreddit: "weed",
    title: "Best marijuana strain for anxiety?",
    snippet:
      "GrowWeedEasy mega-thread covering the best anxiety chemovars across all major strains.",
    conditions: ["anxiety"],
    strains: [],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/depression/comments/1cxjx6/can_some_of_you_share_your_experiences_with_weed/",
    subreddit: "depression",
    title: "Can some of you share your experiences with weed and depression?",
    snippet:
      "Patients report short-term mood lift from cannabis; longer-term effect is mixed and individual.",
    conditions: ["depression", "mood"],
    strains: [],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/depression/comments/16snqzl/is_it_okay_to_use_cannabis_while_you_are_depressed/",
    subreddit: "depression",
    title: "Is it okay to use cannabis while you are depressed?",
    snippet:
      "Patient-led discussion: mixed evidence, cannabis helps some and worsens others.",
    conditions: ["depression"],
    strains: [],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/depression/comments/1feq3ej/weed_and_mental_health/",
    subreddit: "depression",
    title: "Weed and mental health",
    snippet:
      "Myrcene-forward strains cited for evening mood / sleep, sativa-leaning for daytime.",
    conditions: ["depression", "sleep"],
    strains: [],
    score: 0,
  },
  {
    url: "https://old.reddit.com/r/backpain/comments/1dwgz0k/can_anyone_recommend_a_specific_strain_of_medical/",
    subreddit: "backpain",
    title: "Can anyone recommend a specific strain of medical cannabis for back pain?",
    snippet:
      "RSO (Rick Simpson Oil) called out as a high-potency rescue option for breakthrough pain.",
    conditions: ["chronic pain", "back pain"],
    strains: [],
    score: 0,
  },
];

/** Deduplicate seeds by lowercase URL. */
function normalizeStrainName(name: string): string {
  return name
    .toLowerCase()
    .replace(/girl scout cookies|gsc/g, "girl scout cookies")
    .replace(/gorilla glue #?4|gg4/g, "gorilla glue")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function strainMatches(seedName: string, requested: string): boolean {
  const seed = normalizeStrainName(seedName);
  const wanted = normalizeStrainName(requested);
  return seed === wanted || seed.includes(wanted) || wanted.includes(seed);
}

function uniqueByUrl(items: Seed[]): Seed[] {
  const seen = new Set<string>();
  const out: Seed[] = [];
  for (const item of items) {
    const key = item.url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

const DEDUPED = uniqueByUrl(SEEDS);

/** Return the full seed list — used in the compare prompt context. */
export function redditSeedPool(): Seed[] {
  return DEDUPED;
}

/**
 * Filter the seed pool to threads most relevant to a given condition +
 * strain set. Used by the recommender callable (no LLM in the loop).
 */
export function matchRedditSeeds(args: {
  conditions: string[];
  strainNames: string[];
  limit?: number;
}): RedditSource[] {
  const conditions = args.conditions.map((c) => c.trim().toLowerCase()).filter(Boolean);
  const strains = args.strainNames.map((s) => s.trim()).filter(Boolean);
  const limit = Math.max(1, Math.min(args.limit ?? 6, 12));

  const scored: { score: number; source: RedditSource }[] = [];
  for (const seed of DEDUPED) {
    let score = 0;
    for (const condition of conditions) {
      if (seed.conditions.includes(condition)) score += 3;
      // Fuzzy match: condition keyword inside any of the seed's conditions.
      if (
        score === 0 &&
        seed.conditions.some((c) => c.includes(condition) || condition.includes(c))
      ) {
        score += 1;
      }
    }
    for (const strain of strains) {
      if (seed.strains.some((candidate) => strainMatches(candidate, strain))) score += 4;
    }
    // A condition-only thread is not evidence for a specific strain.
    // Require an explicit strain association whenever strains are supplied.
    if (strains.length > 0 && !strains.some((strain) => seed.strains.some((candidate) => strainMatches(candidate, strain)))) continue;
    if (score === 0) continue;
    const { conditions: _c, strains: _s, ...source } = seed;
    scored.push({ score, source });
  }

  scored.sort((a, b) => b.score - a.score);
  // Do not surface a generic title as strain evidence unless its vetted
  // metadata names the requested strain. This prevents the old behavior
  // where a sleep/pain thread was attached to every recommended strain.
  return scored.slice(0, limit).map((s) => s.source);
}

/**
 * Build a compact, model-friendly list of vetted Reddit threads for the
 * compare prompt. We strip the metadata fields (`conditions`, `strains`)
 * so the model only sees what it should put in `redditSources`.
 */
export function redditSeedForPrompt(): RedditSource[] {
  return DEDUPED.map(({ conditions: _c, strains: _s, ...source }) => source);
}

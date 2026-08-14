// Curated strain knowledge base for StrainWise.
//
// Each profile aggregates commonly reported information from public sources:
// Leafly strain reviews, Weedmaps listings, Reddit discussions (r/trees,
// r/medicalmarijuana, r/MMJ), Google results, and dispensary menus.
// Nothing here is a medical claim — it reflects what patients and
// dispensaries commonly report, and the app always surfaces a disclaimer.

export type StrainType = "indica" | "sativa" | "hybrid";

export type SeedStrain = {
  name: string;
  slug: string;
  type: StrainType;
  thcRange: string;
  cbdRange: string;
  terpenes: { name: string; profile: string }[];
  medicalUses: string[];
  effects: { name: string; intensity: number }[];
  sideEffects: string[];
  lineage: string;
  description: string;
  communityNotes: { source: string; text: string }[];
};

export const SEED_STRAINS: SeedStrain[] = [
  // ───────────────────────────── INDICA ─────────────────────────────
  {
    name: "Granddaddy Purple",
    slug: "granddaddy-purple",
    type: "indica",
    thcRange: "17–23%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Pinene", profile: "pine, alert" },
    ],
    medicalUses: ["Insomnia", "Chronic pain", "Muscle spasm", "Stress"],
    effects: [
      { name: "Relaxed", intensity: 5 },
      { name: "Sleepy", intensity: 4 },
      { name: "Euphoric", intensity: 3 },
      { name: "Hungry", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dizziness", "Dry eyes"],
    lineage: "Purple Urkle × Big Bud",
    description:
      "A classic grape-scented indica known for a deep body calm that often leads to sleep.",
    communityNotes: [
      {
        source: "Leafly",
        text: "Reviewers most often use it for insomnia, pain, and stress, and describe the high as a heavy body relaxation.",
      },
      {
        source: "Reddit",
        text: "Patients commonly recommend GDP for night-time use when pain keeps them from falling asleep.",
      },
    ],
  },
  {
    name: "Northern Lights",
    slug: "northern-lights",
    type: "indica",
    thcRange: "16–21%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Pinene", profile: "pine, alert" },
    ],
    medicalUses: ["Insomnia", "Chronic pain", "Stress", "Nausea & appetite"],
    effects: [
      { name: "Relaxed", intensity: 5 },
      { name: "Sleepy", intensity: 4 },
      { name: "Euphoric", intensity: 3 },
      { name: "Hungry", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dizziness", "Paranoia (rare)"],
    lineage: "Afghani landrace × Thai landrace",
    description:
      "One of the most widely known indicas, prized for a smooth, heavy relaxation with a sweet-spice aroma.",
    communityNotes: [
      {
        source: "Weedmaps",
        text: "Listings frequently tag it as an evening strain recommended for sleep and stress relief.",
      },
      {
        source: "Reddit",
        text: "Long-time patients describe it as a reliable, consistent choice when they need a dependable body high.",
      },
    ],
  },
  {
    name: "Blueberry",
    slug: "blueberry",
    type: "indica",
    thcRange: "16–24%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Linalool", profile: "floral, calming" },
      { name: "Caryophyllene", profile: "peppery, calming" },
    ],
    medicalUses: ["Chronic pain", "Insomnia", "Stress", "Depression"],
    effects: [
      { name: "Relaxed", intensity: 5 },
      { name: "Euphoric", intensity: 4 },
      { name: "Sleepy", intensity: 3 },
      { name: "Hungry", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Dizziness"],
    lineage: "Purple Thai × Afghani",
    description:
      "A fruity, sweet-smelling indica with a mellow, full-body calm that keeps the mind clear.",
    communityNotes: [
      {
        source: "Leafly",
        text: "A long-running favorite on Leafly, commonly reviewed for stress, pain, and a gently euphoric mood lift.",
      },
      {
        source: "Dispensary menus",
        text: "Frequently suggested by budtenders to patients who want relaxation without feeling overly sedated.",
      },
    ],
  },
  {
    name: "Bubba Kush",
    slug: "bubba-kush",
    type: "indica",
    thcRange: "15–22%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Limonene", profile: "citrus, uplifting" },
    ],
    medicalUses: ["Insomnia", "Chronic pain", "Stress", "Anxiety"],
    effects: [
      { name: "Relaxed", intensity: 5 },
      { name: "Sleepy", intensity: 4 },
      { name: "Euphoric", intensity: 3 },
      { name: "Hungry", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Sleepiness"],
    lineage: "Bubba Kush (Afghani × OG Kush) — stabilized indica",
    description:
      "A chocolaty, coffee-scented indica delivering a full-body sedation that melts tension away.",
    communityNotes: [
      {
        source: "Leafly",
        text: "Reviewers report it as one of the stronger evening strains for pain and a fast transition to sleep.",
      },
      {
        source: "Reddit",
        text: "Users describe a heavy, couch-locking calm that some find best reserved for the end of the day.",
      },
    ],
  },
  {
    name: "Purple Punch",
    slug: "purple-punch",
    type: "indica",
    thcRange: "18–23%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Limonene", profile: "citrus, uplifting" },
    ],
    medicalUses: ["Insomnia", "Chronic pain", "Nausea & appetite", "Stress"],
    effects: [
      { name: "Relaxed", intensity: 5 },
      { name: "Sleepy", intensity: 5 },
      { name: "Euphoric", intensity: 3 },
      { name: "Hungry", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dizziness", "Dry eyes"],
    lineage: "Larry OG × Granddaddy Purple",
    description:
      "A grape-and-berry dessert-like indica that is potent and fast-acting for evening relief.",
    communityNotes: [
      {
        source: "Weedmaps",
        text: "Frequently listed as a top choice for patients seeking help with sleep and appetite.",
      },
      {
        source: "Reddit",
        text: "Patients note it can be deceptively strong, recommending small doses for first-time use.",
      },
    ],
  },
  {
    name: "Afghan Kush",
    slug: "afghan-kush",
    type: "indica",
    thcRange: "14–20%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Pinene", profile: "pine, alert" },
    ],
    medicalUses: ["Chronic pain", "Insomnia", "Muscle spasm", "Nausea & appetite"],
    effects: [
      { name: "Relaxed", intensity: 5 },
      { name: "Sleepy", intensity: 4 },
      { name: "Euphoric", intensity: 2 },
      { name: "Hungry", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Lethargy"],
    lineage: "Afghani landrace (Hindu Kush region)",
    description:
      "A pure-bred landrace indica with a heavy, physical calm and a woodsy, earthy aroma.",
    communityNotes: [
      {
        source: "Leafly",
        text: "Reviewers consistently pair it with pain, insomnia, and muscle spasms rather than recreational use.",
      },
      {
        source: "Dispensary menus",
        text: "A staple recommendation for patients looking for a straightforward, mellow indica without surprises.",
      },
    ],
  },
  {
    name: "Hindu Kush",
    slug: "hindu-kush",
    type: "indica",
    thcRange: "15–20%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Humulene", profile: "earthy, appetite-suppressing" },
    ],
    medicalUses: ["Chronic pain", "Insomnia", "Stress", "Nausea & appetite"],
    effects: [
      { name: "Relaxed", intensity: 5 },
      { name: "Sleepy", intensity: 4 },
      { name: "Euphoric", intensity: 2 },
      { name: "Tingly", intensity: 2 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Sleepiness"],
    lineage: "Hindu Kush landrace",
    description:
      "The namesake of the Kush family, known for a soft, slow-building body relaxation.",
    communityNotes: [
      {
        source: "Reddit",
        text: "Often recommended to patients new to cannabis for its gentle, predictable effects.",
      },
      {
        source: "Weedmaps",
        text: "Menus tag it as an accessible evening strain for stress and pain at moderate potencies.",
      },
    ],
  },
  {
    name: "9 Pound Hammer",
    slug: "9-pound-hammer",
    type: "indica",
    thcRange: "17–23%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Limonene", profile: "citrus, uplifting" },
    ],
    medicalUses: ["Insomnia", "Chronic pain", "Muscle spasm", "Anxiety"],
    effects: [
      { name: "Relaxed", intensity: 5 },
      { name: "Sleepy", intensity: 5 },
      { name: "Euphoric", intensity: 3 },
      { name: "Tingly", intensity: 2 },
    ],
    sideEffects: ["Dry mouth", "Dizziness", "Sleepiness"],
    lineage: "Gooberry × Hellfire OG",
    description:
      "A high-potency indica whose name hints at its signature effect: a heavy, sleep-inducing calm.",
    communityNotes: [
      {
        source: "Reddit",
        text: "Users describe a dense body stone that is one of the most reliable sleep aids they have tried.",
      },
      {
        source: "Dispensary menus",
        text: "Budtenders reach for it when a patient says nothing else has helped them sleep.",
      },
    ],
  },

  // ───────────────────────────── SATIVA ─────────────────────────────
  {
    name: "Jack Herer",
    slug: "jack-herer",
    type: "sativa",
    thcRange: "18–23%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Terpinolene", profile: "fresh, uplifting" },
      { name: "Pinene", profile: "pine, alert" },
      { name: "Caryophyllene", profile: "peppery, calming" },
    ],
    medicalUses: ["Fatigue", "Depression", "Stress", "ADHD focus", "Migraine"],
    effects: [
      { name: "Energetic", intensity: 5 },
      { name: "Focused", intensity: 4 },
      { name: "Euphoric", intensity: 4 },
      { name: "Creative", intensity: 4 },
    ],
    sideEffects: ["Dry mouth", "Anxiety (high doses)", "Dry eyes"],
    lineage: "Northern Lights #5 × Haze × Shiva Skunk",
    description:
      "A legendary sativa named after the cannabis activist, famous for a clear-headed, creative energy.",
    communityNotes: [
      {
        source: "Leafly",
        text: "Consistently rated among the top sativas for daytime focus, fatigue, and mood support.",
      },
      {
        source: "Reddit",
        text: "Patients with ADHD frequently mention that it helps them concentrate on tasks without jitteriness.",
      },
    ],
  },
  {
    name: "Sour Diesel",
    slug: "sour-diesel",
    type: "sativa",
    thcRange: "19–24%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Limonene", profile: "citrus, uplifting" },
      { name: "Terpinolene", profile: "fresh, uplifting" },
    ],
    medicalUses: ["Stress", "Depression", "Chronic pain", "Fatigue"],
    effects: [
      { name: "Energetic", intensity: 5 },
      { name: "Uplifted", intensity: 5 },
      { name: "Talkative", intensity: 4 },
      { name: "Focused", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Anxiety (sensitive users)", "Dry eyes"],
    lineage: "Chemdawg × Super Skunk × unknown haze",
    description:
      "A pungent, diesel-scented sativa with a fast, euphoric lift that powers through the afternoon.",
    communityNotes: [
      {
        source: "Weedmaps",
        text: "A fixture on dispensary menus for daytime depression and fatigue, prized for its rapid onset.",
      },
      {
        source: "Reddit",
        text: "Patients warn that the energetic buzz can edge into anxiety, recommending it for experienced users.",
      },
    ],
  },
  {
    name: "Green Crack",
    slug: "green-crack",
    type: "sativa",
    thcRange: "16–21%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Terpinolene", profile: "fresh, uplifting" },
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Limonene", profile: "citrus, uplifting" },
    ],
    medicalUses: ["Fatigue", "Depression", "Stress", "ADHD focus"],
    effects: [
      { name: "Energetic", intensity: 5 },
      { name: "Focused", intensity: 5 },
      { name: "Uplifted", intensity: 4 },
      { name: "Talkative", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Anxiety (high doses)", "Headache (rare)"],
    lineage: "Skunk #1 × unknown Afghani",
    description:
      "A sharp, citrusy sativa known for a laser-focused energy that gets things done.",
    communityNotes: [
      {
        source: "Leafly",
        text: "Reviewers call it a daytime powerhouse for fatigue and motivation, with a clean, alert high.",
      },
      {
        source: "Reddit",
        text: "Users compare it to a strong cup of coffee, noting it can amplify anxiety at high doses.",
      },
    ],
  },
  {
    name: "Durban Poison",
    slug: "durban-poison",
    type: "sativa",
    thcRange: "17–24%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Terpinolene", profile: "fresh, uplifting" },
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Pinene", profile: "pine, alert" },
    ],
    medicalUses: ["Depression", "Fatigue", "Stress", "Nausea & appetite"],
    effects: [
      { name: "Energetic", intensity: 5 },
      { name: "Uplifted", intensity: 4 },
      { name: "Focused", intensity: 4 },
      { name: "Euphoric", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Anxiety (sensitive users)", "Dry eyes"],
    lineage: "South African landrace sativa",
    description:
      "A pure African sativa with a sweet, spicy profile and an upbeat, clear-headed buzz.",
    communityNotes: [
      {
        source: "Reddit",
        text: "A go-to for patients who need a dependable daytime strain with no midday crash.",
      },
      {
        source: "Dispensary menus",
        text: "Budtenders recommend it for morning and early-afternoon use when focus is the goal.",
      },
    ],
  },
  {
    name: "Super Lemon Haze",
    slug: "super-lemon-haze",
    type: "sativa",
    thcRange: "18–25%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Limonene", profile: "citrus, uplifting" },
      { name: "Terpinolene", profile: "fresh, uplifting" },
      { name: "Caryophyllene", profile: "peppery, calming" },
    ],
    medicalUses: ["Stress", "Depression", "Fatigue", "Anxiety"],
    effects: [
      { name: "Uplifted", intensity: 5 },
      { name: "Energetic", intensity: 4 },
      { name: "Euphoric", intensity: 4 },
      { name: "Focused", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dizziness", "Dry eyes"],
    lineage: "Lemon Skunk × Super Silver Haze",
    description:
      "A zesty lemon sativa with a sparkling, mood-brightening energy and a social buzz.",
    communityNotes: [
      {
        source: "Leafly",
        text: "Frequently reviewed for anxiety and stress, with users noting the citrus aroma feels genuinely cheering.",
      },
      {
        source: "Weedmaps",
        text: "Listed as a top daytime sativa for mood support across many dispensary menus.",
      },
    ],
  },
  {
    name: "Amnesia Haze",
    slug: "amnesia-haze",
    type: "sativa",
    thcRange: "20–25%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Terpinolene", profile: "fresh, uplifting" },
      { name: "Limonene", profile: "citrus, uplifting" },
      { name: "Caryophyllene", profile: "peppery, calming" },
    ],
    medicalUses: ["Stress", "Depression", "Fatigue", "Migraine"],
    effects: [
      { name: "Euphoric", intensity: 5 },
      { name: "Energetic", intensity: 4 },
      { name: "Uplifted", intensity: 4 },
      { name: "Talkative", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Anxiety (high doses)", "Paranoia (rare)"],
    lineage: "Haze × Skunk #1 × Laos × Afghani",
    description:
      "A potent haze with a citrus-and-earthy aroma and a soaring, clear-headed euphoria.",
    communityNotes: [
      {
        source: "Reddit",
        text: "Patients rate it highly for migraines and low mood, while warning that it is strong for beginners.",
      },
      {
        source: "Leafly",
        text: "A multi-award winner that reviewers consistently describe as uplifting without fogginess.",
      },
    ],
  },
  {
    name: "Strawberry Cough",
    slug: "strawberry-cough",
    type: "sativa",
    thcRange: "17–23%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Pinene", profile: "pine, alert" },
    ],
    medicalUses: ["Stress", "Anxiety", "Depression", "Fatigue"],
    effects: [
      { name: "Uplifted", intensity: 4 },
      { name: "Euphoric", intensity: 4 },
      { name: "Energetic", intensity: 3 },
      { name: "Focused", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Cough (harsh vapor)", "Dry eyes"],
    lineage: "Strawberry Fields × Haze",
    description:
      "A sweet berry sativa with a gentle, giggly lift that is often recommended to anxiety-prone patients.",
    communityNotes: [
      {
        source: "Reddit",
        text: "A commonly suggested first sativa for patients who are sensitive to anxiety, thanks to its smooth mood lift.",
      },
      {
        source: "Dispensary menus",
        text: "Budtenders often pair it with stress and depression for patients who want a calmer daytime option.",
      },
    ],
  },
  {
    name: "Tangie",
    slug: "tangie",
    type: "sativa",
    thcRange: "16–22%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Limonene", profile: "citrus, uplifting" },
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Caryophyllene", profile: "peppery, calming" },
    ],
    medicalUses: ["Stress", "Depression", "Anxiety", "Fatigue"],
    effects: [
      { name: "Uplifted", intensity: 5 },
      { name: "Euphoric", intensity: 4 },
      { name: "Energetic", intensity: 4 },
      { name: "Creative", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Anxiety (high doses)"],
    lineage: "California Orange × Skunk #1",
    description:
      "An intensely orange-scented sativa delivering a bright, mood-lifting daytime high.",
    communityNotes: [
      {
        source: "Leafly",
        text: "Reviewers praise its instant mood lift and describe it as a sunshine-in-a-jar daytime strain.",
      },
      {
        source: "Weedmaps",
        text: "Commonly tagged on menus for stress and depression relief during the day.",
      },
    ],
  },

  // ───────────────────────────── HYBRID ─────────────────────────────
  {
    name: "Blue Dream",
    slug: "blue-dream",
    type: "hybrid",
    thcRange: "17–24%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Pinene", profile: "pine, alert" },
      { name: "Caryophyllene", profile: "peppery, calming" },
    ],
    medicalUses: ["Chronic pain", "Depression", "Stress", "Insomnia", "Fatigue"],
    effects: [
      { name: "Relaxed", intensity: 4 },
      { name: "Euphoric", intensity: 4 },
      { name: "Uplifted", intensity: 4 },
      { name: "Focused", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Dizziness (rare)"],
    lineage: "Blueberry × Haze",
    description:
      "A sativa-leaning hybrid balancing full-body relaxation with a clear-headed, gentle euphoria.",
    communityNotes: [
      {
        source: "Leafly",
        text: "One of the most-reviewed strains ever, widely used for pain and stress without heavy sedation.",
      },
      {
        source: "Reddit",
        text: "Patients describe it as a dependable all-day option — calm but functional — especially for pain with mood dips.",
      },
    ],
  },
  {
    name: "Girl Scout Cookies",
    slug: "girl-scout-cookies",
    type: "hybrid",
    thcRange: "19–27%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Limonene", profile: "citrus, uplifting" },
      { name: "Humulene", profile: "earthy, appetite-suppressing" },
    ],
    medicalUses: ["Chronic pain", "Nausea & appetite", "Stress", "Anxiety", "Depression"],
    effects: [
      { name: "Euphoric", intensity: 5 },
      { name: "Relaxed", intensity: 4 },
      { name: "Hungry", intensity: 4 },
      { name: "Uplifted", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dizziness", "Paranoia (rare)"],
    lineage: "Durban Poison × OG Kush",
    description:
      "A potent dessert-like hybrid with a euphoric rush that melts into full-body relaxation.",
    communityNotes: [
      {
        source: "Leafly",
        text: "An award-winning strain frequently reviewed for chronic pain and appetite support.",
      },
      {
        source: "Reddit",
        text: "Users note the strong euphoria can be intense, recommending smaller doses for anxiety-prone patients.",
      },
    ],
  },
  {
    name: "Gorilla Glue #4",
    slug: "gorilla-glue-4",
    type: "hybrid",
    thcRange: "20–30%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Limonene", profile: "citrus, uplifting" },
      { name: "Myrcene", profile: "sedating, earthy" },
    ],
    medicalUses: ["Chronic pain", "Stress", "Insomnia", "Depression"],
    effects: [
      { name: "Relaxed", intensity: 4 },
      { name: "Euphoric", intensity: 4 },
      { name: "Sleepy", intensity: 3 },
      { name: "Hungry", intensity: 4 },
    ],
    sideEffects: ["Dry mouth", "Dizziness", "Anxiety (high doses)"],
    lineage: "Chem's Sister × Sour Dubb × Chocolate Diesel",
    description:
      "A sticky, resin-heavy hybrid named for its potency, delivering strong pain relief and deep relaxation.",
    communityNotes: [
      {
        source: "Leafly",
        text: "Consistently rated among the strongest strains for chronic pain relief in community reviews.",
      },
      {
        source: "Weedmaps",
        text: "Menus recommend it for experienced patients; the high potency can overwhelm new users.",
      },
    ],
  },
  {
    name: "Gelato",
    slug: "gelato",
    type: "hybrid",
    thcRange: "20–25%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Limonene", profile: "citrus, uplifting" },
      { name: "Linalool", profile: "floral, calming" },
    ],
    medicalUses: ["Stress", "Anxiety", "Depression", "Chronic pain"],
    effects: [
      { name: "Euphoric", intensity: 4 },
      { name: "Relaxed", intensity: 4 },
      { name: "Uplifted", intensity: 3 },
      { name: "Hungry", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Dizziness"],
    lineage: "Sunset Sherbet × Thin Mint GSC",
    description:
      "A creamy, fruity hybrid with a smooth euphoria and relaxing body high that stays sociable.",
    communityNotes: [
      {
        source: "Reddit",
        text: "Patients with anxiety favor it for a calm, cloudless high that does not spiral into paranoia.",
      },
      {
        source: "Dispensary menus",
        text: "A popular mid-to-late-day recommendation for stress relief while staying functional.",
      },
    ],
  },
  {
    name: "Wedding Cake",
    slug: "wedding-cake",
    type: "hybrid",
    thcRange: "20–26%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Limonene", profile: "citrus, uplifting" },
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Myrcene", profile: "sedating, earthy" },
    ],
    medicalUses: ["Chronic pain", "Stress", "Insomnia", "Nausea & appetite"],
    effects: [
      { name: "Euphoric", intensity: 4 },
      { name: "Relaxed", intensity: 4 },
      { name: "Sleepy", intensity: 3 },
      { name: "Hungry", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dizziness", "Paranoia (rare)"],
    lineage: "Triangle Kush × Animal Mints",
    description:
      "A sweet vanilla-and-pepper hybrid that starts uplifting and settles into a comfortable body calm.",
    communityNotes: [
      {
        source: "Leafly",
        text: "Reviewers report solid relief for pain and stress, often turning into sleepiness at higher doses.",
      },
      {
        source: "Reddit",
        text: "Users compare its arc to a long exhale — strong up front, then a smooth, relaxed comedown.",
      },
    ],
  },
  {
    name: "White Widow",
    slug: "white-widow",
    type: "hybrid",
    thcRange: "18–25%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Limonene", profile: "citrus, uplifting" },
    ],
    medicalUses: ["Stress", "Depression", "Chronic pain", "Fatigue"],
    effects: [
      { name: "Euphoric", intensity: 4 },
      { name: "Uplifted", intensity: 4 },
      { name: "Energetic", intensity: 3 },
      { name: "Relaxed", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dizziness", "Anxiety (sensitive users)"],
    lineage: "Brazilian sativa × South Indian indica",
    description:
      "A balanced 90s classic with a clean, focused buzz and a comfortable body ease.",
    communityNotes: [
      {
        source: "Weedmaps",
        text: "A perennial menu staple described by dispensaries as a versatile day-to-evening hybrid.",
      },
      {
        source: "Reddit",
        text: "Long-time patients call it a solid baseline strain — effective, balanced, and easy to dose.",
      },
    ],
  },
  {
    name: "Pineapple Express",
    slug: "pineapple-express",
    type: "hybrid",
    thcRange: "17–23%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Limonene", profile: "citrus, uplifting" },
    ],
    medicalUses: ["Stress", "Fatigue", "Chronic pain", "Depression"],
    effects: [
      { name: "Uplifted", intensity: 4 },
      { name: "Euphoric", intensity: 4 },
      { name: "Relaxed", intensity: 3 },
      { name: "Energetic", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Paranoia (rare)"],
    lineage: "Pineapple × Trainwreck × Hawaiian",
    description:
      "A tropical, fruity hybrid with an energetic spark that fades into gentle relaxation.",
    communityNotes: [
      {
        source: "Leafly",
        text: "Reviewers enjoy it as a mood-lifting daytime strain that does not interfere with getting things done.",
      },
      {
        source: "Dispensary menus",
        text: "Budtenders recommend it to patients who want energy and pain relief without couch-lock.",
      },
    ],
  },
  {
    name: "Runtz",
    slug: "runtz",
    type: "hybrid",
    thcRange: "19–27%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Limonene", profile: "citrus, uplifting" },
      { name: "Linalool", profile: "floral, calming" },
    ],
    medicalUses: ["Stress", "Anxiety", "Depression", "Chronic pain"],
    effects: [
      { name: "Euphoric", intensity: 4 },
      { name: "Relaxed", intensity: 4 },
      { name: "Uplifted", intensity: 3 },
      { name: "Hungry", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Dizziness"],
    lineage: "Zkittlez × Gelato",
    description:
      "A candy-sweet hybrid known for a giggly, sociable euphoria with a soft landing.",
    communityNotes: [
      {
        source: "Reddit",
        text: "Patients describe it as a happy, low-anxiety high, popular for stress and low mood.",
      },
      {
        source: "Weedmaps",
        text: "Listed on menus as a balanced hybrid for mood support from afternoon into evening.",
      },
    ],
  },
  {
    name: "Zkittlez",
    slug: "zkittlez",
    type: "hybrid",
    thcRange: "18–25%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Limonene", profile: "citrus, uplifting" },
      { name: "Myrcene", profile: "sedating, earthy" },
    ],
    medicalUses: ["Stress", "Anxiety", "Depression", "Nausea & appetite"],
    effects: [
      { name: "Euphoric", intensity: 4 },
      { name: "Relaxed", intensity: 4 },
      { name: "Uplifted", intensity: 3 },
      { name: "Sleepy", intensity: 2 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Lethargy (high doses)"],
    lineage: "Grape Ape × Grapefruit",
    description:
      "A tropical fruit-bomb hybrid with a happy, calm buzz that rarely feels heavy.",
    communityNotes: [
      {
        source: "Leafly",
        text: "Reviewers praise its mood-lifting effect and note it is gentler on anxiety than many hybrids.",
      },
      {
        source: "Reddit",
        text: "A frequent pick for patients who want stress relief that still allows them to eat and socialize.",
      },
    ],
  },
  {
    name: "Bruce Banner",
    slug: "bruce-banner",
    type: "hybrid",
    thcRange: "22–30%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Limonene", profile: "citrus, uplifting" },
    ],
    medicalUses: ["Chronic pain", "Stress", "Fatigue", "Depression"],
    effects: [
      { name: "Euphoric", intensity: 4 },
      { name: "Energetic", intensity: 4 },
      { name: "Uplifted", intensity: 4 },
      { name: "Relaxed", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Anxiety (high doses)", "Paranoia (rare)"],
    lineage: "Strawberry Diesel × OG Kush",
    description:
      "A high-potency hybrid delivering a surge of creative energy followed by a comfortable body calm.",
    communityNotes: [
      {
        source: "Weedmaps",
        text: "Menus flag it as a high-THC choice for serious pain and fatigue in experienced patients.",
      },
      {
        source: "Reddit",
        text: "Users describe a strong, fast wave of euphoria and recommend caution with dosing early in the day.",
      },
    ],
  },
  {
    name: "OG Kush",
    slug: "og-kush",
    type: "hybrid",
    thcRange: "19–25%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Limonene", profile: "citrus, uplifting" },
      { name: "Myrcene", profile: "sedating, earthy" },
    ],
    medicalUses: ["Stress", "Chronic pain", "Insomnia", "Anxiety"],
    effects: [
      { name: "Relaxed", intensity: 4 },
      { name: "Euphoric", intensity: 4 },
      { name: "Sleepy", intensity: 3 },
      { name: "Hungry", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Dizziness"],
    lineage: "Chemdawg × Lemon Thai × Pakistani Kush",
    description:
      "The West Coast classic — a fuel-scented hybrid with a smooth, full-spectrum calm.",
    communityNotes: [
      {
        source: "Leafly",
        text: "One of the most iconic strains, consistently reviewed for stress and pain with a balanced high.",
      },
      {
        source: "Reddit",
        text: "Patients describe it as the strain that made them understand the difference between indica and hybrid effects.",
      },
    ],
  },
  {
    name: "Blackberry Kush",
    slug: "blackberry-kush",
    type: "indica",
    thcRange: "16–22%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Linalool", profile: "floral, calming" },
    ],
    medicalUses: ["Chronic pain", "Insomnia", "Stress", "Muscle spasm"],
    effects: [
      { name: "Relaxed", intensity: 5 },
      { name: "Sleepy", intensity: 4 },
      { name: "Euphoric", intensity: 3 },
      { name: "Hungry", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Dizziness"],
    lineage: "Afghani × Blackberry",
    description:
      "A grape-and-berry indica with a gentle, body-focused calm that patients often reach for before bed.",
    communityNotes: [
      {
        source: "Leafly",
        text: "Reviewers commonly pair it with pain and insomnia, describing a soft landing into sleep.",
      },
      {
        source: "Reddit",
        text: "Patients note it relaxes without the racing thoughts some stronger indicas can bring on.",
      },
    ],
  },
  {
    name: "LA Confidential",
    slug: "la-confidential",
    type: "indica",
    thcRange: "17–25%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Pinene", profile: "pine, alert" },
    ],
    medicalUses: ["Chronic pain", "Insomnia", "Stress", "Nausea & appetite"],
    effects: [
      { name: "Relaxed", intensity: 5 },
      { name: "Sleepy", intensity: 4 },
      { name: "Euphoric", intensity: 3 },
      { name: "Hungry", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dizziness", "Paranoia (rare)"],
    lineage: "Afghani × Skunk #1",
    description:
      "A piney, kush-scented indica prized for strong full-body relief that quiets both pain and worry.",
    communityNotes: [
      {
        source: "Leafly",
        text: "Consistently reviewed for insomnia and chronic pain, often called a heavy hitter for evenings.",
      },
      {
        source: "Weedmaps",
        text: "A staple evening listing on menus, recommended when patients need pronounced physical relaxation.",
      },
    ],
  },
  {
    name: "Chocolate OG",
    slug: "chocolate-og",
    type: "indica",
    thcRange: "17–23%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Linalool", profile: "floral, calming" },
    ],
    medicalUses: ["Chronic pain", "Insomnia", "Nausea & appetite", "Stress"],
    effects: [
      { name: "Relaxed", intensity: 5 },
      { name: "Sleepy", intensity: 4 },
      { name: "Euphoric", intensity: 3 },
      { name: "Hungry", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Dizziness"],
    lineage: "Chocolate Thai × OG Kush",
    description:
      "A cocoa-and-earth indica with a smooth, heavy calm that is especially noted for appetite support.",
    communityNotes: [
      {
        source: "Reddit",
        text: "Patients mention it reliably sparks appetite and helps with pain without feeling overwhelming.",
      },
      {
        source: "Dispensary menus",
        text: "Budtenders suggest it after dinner for patients who want relaxation plus a munchies assist.",
      },
    ],
  },
  {
    name: "Godfather OG",
    slug: "godfather-og",
    type: "indica",
    thcRange: "24–30%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Limonene", profile: "citrus, uplifting" },
    ],
    medicalUses: ["Chronic pain", "Insomnia", "Muscle spasm", "Stress"],
    effects: [
      { name: "Relaxed", intensity: 5 },
      { name: "Sleepy", intensity: 5 },
      { name: "Euphoric", intensity: 3 },
      { name: "Tingly", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dizziness", "Lethargy"],
    lineage: "Alien Kush × Thunder OG",
    description:
      "One of the most potent indicas around, delivering deep sedation that patients reserve for severe pain or sleepless nights.",
    communityNotes: [
      {
        source: "Weedmaps",
        text: "Listings flag it as a high-THC, experienced-user strain for serious pain and insomnia.",
      },
      {
        source: "Reddit",
        text: "Users advise respecting the dose — a little goes a long way, especially for new patients.",
      },
    ],
  },
  {
    name: "Do-Si-Dos",
    slug: "do-si-dos",
    type: "hybrid",
    thcRange: "20–28%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Limonene", profile: "citrus, uplifting" },
      { name: "Myrcene", profile: "sedating, earthy" },
    ],
    medicalUses: ["Insomnia", "Chronic pain", "Stress", "Nausea & appetite"],
    effects: [
      { name: "Euphoric", intensity: 4 },
      { name: "Relaxed", intensity: 4 },
      { name: "Sleepy", intensity: 4 },
      { name: "Hungry", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Dizziness"],
    lineage: "Girl Scout Cookies × Face Off OG",
    description:
      "A cookies-family hybrid whose euphoric start melts into a heavy, sleep-ready body calm.",
    communityNotes: [
      {
        source: "Leafly",
        text: "Reviewers reach for it mainly at night for insomnia and pain, praising the potent, lingering calm.",
      },
      {
        source: "Reddit",
        text: "Patients describe it as stronger than expected and best saved for the end of the day.",
      },
    ],
  },
  {
    name: "Apple Fritter",
    slug: "apple-fritter",
    type: "hybrid",
    thcRange: "19–26%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Limonene", profile: "citrus, uplifting" },
      { name: "Humulene", profile: "earthy, appetite-suppressing" },
    ],
    medicalUses: ["Stress", "Chronic pain", "Depression", "Nausea & appetite"],
    effects: [
      { name: "Euphoric", intensity: 4 },
      { name: "Relaxed", intensity: 4 },
      { name: "Uplifted", intensity: 3 },
      { name: "Hungry", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dizziness", "Dry eyes"],
    lineage: "Sour Apple × Animal Cookies",
    description:
      "A sweet apple-pastry hybrid that lifts the mood while smoothing out tension in the body.",
    communityNotes: [
      {
        source: "Reddit",
        text: "Patients enjoy it for stress relief that stays creative and sociable rather than couch-locking.",
      },
      {
        source: "Weedmaps",
        text: "Menus list it as a balanced hybrid for mood support from mid-afternoon into evening.",
      },
    ],
  },
  {
    name: "Cereal Milk",
    slug: "cereal-milk",
    type: "hybrid",
    thcRange: "20–27%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Limonene", profile: "citrus, uplifting" },
      { name: "Myrcene", profile: "sedating, earthy" },
    ],
    medicalUses: ["Depression", "Stress", "Anxiety", "Fatigue"],
    effects: [
      { name: "Euphoric", intensity: 4 },
      { name: "Uplifted", intensity: 4 },
      { name: "Relaxed", intensity: 3 },
      { name: "Focused", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Dizziness"],
    lineage: "Snowman × Y Life",
    description:
      "A creamy, sweet hybrid with a happy, clear-headed buzz that patients rate for low mood and stress.",
    communityNotes: [
      {
        source: "Leafly",
        text: "Reviewers describe a smooth euphoria that brightens mood without a heavy or foggy comedown.",
      },
      {
        source: "Reddit",
        text: "Anxiety-prone patients favor it as a daytime option that rarely tips into racing thoughts.",
      },
    ],
  },
  {
    name: "Headband",
    slug: "headband",
    type: "hybrid",
    thcRange: "19–27%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Limonene", profile: "citrus, uplifting" },
      { name: "Pinene", profile: "pine, alert" },
    ],
    medicalUses: ["Migraine", "Chronic pain", "Stress", "Fatigue"],
    effects: [
      { name: "Relaxed", intensity: 4 },
      { name: "Euphoric", intensity: 4 },
      { name: "Uplifted", intensity: 3 },
      { name: "Focused", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Anxiety (high doses)"],
    lineage: "Sour Diesel × OG Kush",
    description:
      "A fuel-scented hybrid named for its distinctive head pressure, widely mentioned for headache and migraine relief.",
    communityNotes: [
      {
        source: "Leafly",
        text: "Reviewers frequently cite it for tension headaches and migraines, along with a relaxing body buzz.",
      },
      {
        source: "Reddit",
        text: "Patients describe a noticeable ease around the head and eyes, which is where the name comes from.",
      },
    ],
  },
  {
    name: "Mimosa",
    slug: "mimosa",
    type: "hybrid",
    thcRange: "19–25%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Limonene", profile: "citrus, uplifting" },
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Myrcene", profile: "sedating, earthy" },
    ],
    medicalUses: ["Depression", "Fatigue", "Anxiety", "Stress"],
    effects: [
      { name: "Uplifted", intensity: 5 },
      { name: "Euphoric", intensity: 4 },
      { name: "Energetic", intensity: 4 },
      { name: "Focused", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dizziness", "Dry eyes"],
    lineage: "Purple Punch × Clementine",
    description:
      "A bright, citrus brunch of a hybrid that delivers a sparkling mood lift without the jitters.",
    communityNotes: [
      {
        source: "Weedmaps",
        text: "Tagged on menus as a daytime mood-brightener for depression and fatigue.",
      },
      {
        source: "Reddit",
        text: "Patients call it a gentle morning energizer — awake and upbeat, but still steady-handed.",
      },
    ],
  },
  {
    name: "Super Silver Haze",
    slug: "super-silver-haze",
    type: "sativa",
    thcRange: "18–23%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Terpinolene", profile: "fresh, uplifting" },
      { name: "Caryophyllene", profile: "peppery, calming" },
      { name: "Limonene", profile: "citrus, uplifting" },
    ],
    medicalUses: ["Depression", "Fatigue", "Migraine", "Stress"],
    effects: [
      { name: "Energetic", intensity: 5 },
      { name: "Euphoric", intensity: 4 },
      { name: "Uplifted", intensity: 4 },
      { name: "Focused", intensity: 4 },
    ],
    sideEffects: ["Dry mouth", "Anxiety (sensitive users)", "Dry eyes"],
    lineage: "Skunk #1 × Haze × Northern Lights #5",
    description:
      "An award-winning haze with a sparkling cerebral energy that patients use to cut through fatigue and low mood.",
    communityNotes: [
      {
        source: "Leafly",
        text: "A perennial top-rated sativa for daytime fatigue, depression, and migraine with an alert, clear high.",
      },
      {
        source: "Reddit",
        text: "Users note the fast mind-race can be strong, recommending moderation for anxiety-prone patients.",
      },
    ],
  },
  {
    name: "Tangerine Dream",
    slug: "tangerine-dream",
    type: "sativa",
    thcRange: "18–24%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Limonene", profile: "citrus, uplifting" },
      { name: "Terpinolene", profile: "fresh, uplifting" },
      { name: "Caryophyllene", profile: "peppery, calming" },
    ],
    medicalUses: ["Depression", "Stress", "Fatigue", "Anxiety"],
    effects: [
      { name: "Uplifted", intensity: 5 },
      { name: "Euphoric", intensity: 4 },
      { name: "Energetic", intensity: 4 },
      { name: "Creative", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dry eyes", "Dizziness"],
    lineage: "G13 × Afghani × Neville's A5 Haze",
    description:
      "A sweet orange sativa with a smooth, creative spark that brightens the middle of the day.",
    communityNotes: [
      {
        source: "Leafly",
        text: "Reviewers rate it highly for stress and low mood, calling the citrus lift genuinely cheering.",
      },
      {
        source: "Weedmaps",
        text: "Listed as a favorite afternoon sativa for mood support without a heavy come-down.",
      },
    ],
  },
  {
    name: "Maui Wowie",
    slug: "maui-wowie",
    type: "sativa",
    thcRange: "15–21%",
    cbdRange: "<1%",
    terpenes: [
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Pinene", profile: "pine, alert" },
      { name: "Caryophyllene", profile: "peppery, calming" },
    ],
    medicalUses: ["Fatigue", "Depression", "Stress", "Nausea & appetite"],
    effects: [
      { name: "Uplifted", intensity: 5 },
      { name: "Energetic", intensity: 4 },
      { name: "Euphoric", intensity: 4 },
      { name: "Creative", intensity: 3 },
    ],
    sideEffects: ["Dry mouth", "Dizziness", "Paranoia (rare)"],
    lineage: "Hawaiian landrace sativa",
    description:
      "An island classic with a sunny, tropical lift that keeps patients moving without feeling wired.",
    communityNotes: [
      {
        source: "Reddit",
        text: "Patients describe it as an easygoing daytime sativa that pairs well with low mood and low energy.",
      },
      {
        source: "Dispensary menus",
        text: "Budtenders suggest it for social daytime use and note it is generally gentle on beginners.",
      },
    ],
  },
  {
    name: "ACDC",
    slug: "acdc",
    type: "sativa",
    thcRange: "<1%",
    cbdRange: "10–20%",
    terpenes: [
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Pinene", profile: "pine, alert" },
      { name: "Caryophyllene", profile: "peppery, calming" },
    ],
    medicalUses: ["Anxiety", "Chronic pain", "Inflammation", "Muscle spasm"],
    effects: [
      { name: "Relaxed", intensity: 3 },
      { name: "Focused", intensity: 3 },
      { name: "Uplifted", intensity: 2 },
      { name: "Tingly", intensity: 2 },
    ],
    sideEffects: ["Dry mouth (mild)", "Drowsiness (high doses)", "None reported by most users"],
    lineage: "High-CBD cultivar (Cannatonic family)",
    description:
      "A famously high-CBD, near-zero-THC strain that delivers clear-headed relief without intoxication — a first stop for patients avoiding a high.",
    communityNotes: [
      {
        source: "Leafly",
        text: "Widely reviewed by patients for anxiety, pain, and inflammation who want no psychoactive effect.",
      },
      {
        source: "Reddit",
        text: "Patients on other medications often choose ACDC because it lets them stay fully functional during the day.",
      },
    ],
  },
  {
    name: "Charlotte's Web",
    slug: "charlottes-web",
    type: "hybrid",
    thcRange: "<1%",
    cbdRange: "15–20%",
    terpenes: [
      { name: "Myrcene", profile: "sedating, earthy" },
      { name: "Pinene", profile: "pine, alert" },
      { name: "Linalool", profile: "floral, calming" },
    ],
    medicalUses: ["Anxiety", "Inflammation", "Chronic pain", "Muscle spasm"],
    effects: [
      { name: "Relaxed", intensity: 4 },
      { name: "Focused", intensity: 3 },
      { name: "Uplifted", intensity: 2 },
      { name: "Tingly", intensity: 2 },
    ],
    sideEffects: ["Drowsiness (high doses)", "Dry mouth (mild)"],
    lineage: "High-CBD cultivar (Harliquin-family lineage)",
    description:
      "The world-famous low-THC, high-CBD strain developed for pediatric epilepsy, used by patients seeking calm and comfort without a high.",
    communityNotes: [
      {
        source: "Leafly",
        text: "A landmark CBD strain, commonly discussed for seizure disorders, anxiety, and everyday calm.",
      },
      {
        source: "Reddit",
        text: "Patients describe it as functional and clear — relief they can feel while still working or driving (where legal).",
      },
    ],
  },
];

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
];

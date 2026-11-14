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
      "Blue Dream is a sativa-leaning hybrid from California and the most searched strain on the market for good reason. It pairs a sweet berry aroma with a light herbal finish on the exhale, which makes it easy to pick out of a jar from across the room. The high is gentle and cerebral, with a soft body ease that settles in without pinning you to the couch. Most people reach for it during the day because the effects stay functional, and it is often the first flower people try when stronger weed leaves them anxious or sleepy. Expect a steady mood lift, a mild body buzz, and dry mouth as the most common complaint.",
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
        "Reliable mood lift, depression stays manageable for a few hours after a small bowl.",
      ),
      REDDIT_QUOTE(
        "chronicpain",
        "Blue Dream is my go-to for days when my back is acting up but I still need to function. Pain drops to a 3/10 without the heavy sedation of an indica.",
      ),
    ],
    redditSources: [
      redditSource(
        "chronicpain",
        "Blue Dream for daytime pain, anyone else use it as a daily driver?",
        "Daytime pain relief without sedation is exactly what I need.",
        184,
      ),
    ],
  },
  tailored: {
    sections: [
      {
        heading: "Overview",
        body: "Blue Dream is a balanced hybrid with a reputation for being friendly to first-time and daily patients alike, which is why it keeps surfacing in strain lists for people who are new to this. Its Myrcene-dominant terpene profile leans gentle: most people describe a soft cerebral lift that settles into the body without weighing it down.\n\nIf you have been avoiding flower because it makes you anxious or sleepy, Blue Dream is often the first strain people come back to. The CBD share is small, under 1%, so the effect is clearly THC-led, but the Pinene and Caryophyllene round the edges enough that higher doses do not tip into paranoia for most people.\n\nThe flip side of that gentleness is that it can feel underwhelming. If you are looking for a strong knockout or a distinctly sedating body stone, this is not that strain, and you will probably want something heavier later in the evening.\n\nMost people find the useful window is the middle of the day or the early evening, before it winds down. One small bowl usually lasts two to three hours, and the high tapers gradually rather than dropping off a cliff.",
      },
      {
        heading: "What it might do for you",
        body: "Reported benefits cluster around chronic pain, depression, and stress: the three Leafly-listed uses patients most often confirm in reviews.\n\nFor pain specifically, Blue Dream is most useful when you need relief but still need to function. Think flares that would normally cancel a workday, or a morning when arthritis makes getting out of bed harder than it should be.\n\nIf your main concern is mood, the lift is real but it is not bouncy. Expect a steady uplifted feeling rather than a jolt, which is what makes it usable when you need to keep a clear head for the rest of the day.\n\nWhat it will not do is put you to sleep or take the edge off severe anxiety on its own. If either of those is what you are chasing, a different strain and a conversation with your clinician about what to expect will serve you better than pushing this one further.",
      },
      {
        heading: "What to expect",
        body: "Onset is typical for inhaled flower: a few minutes to feel it, a plateau around 30 minutes, and a gradual taper over two to three hours. Dry mouth is the most reported side effect, so keep water nearby.\n\nStart low if you are THC-sensitive. A single small bowl is enough for most beginners, and you can always take more later. If you are on SSRIs or other psychiatric medications, treat it like any other THC product: start low, go slow, and watch for anxiety spikes.\n\nYou should be able to work and drive normally once it has settled, but the first half hour is not the time to find out. Give it a few minutes and check in with yourself before you make any plans.\n\nKeep in mind that every review you read is anecdotal. That is what other people reported, not a promise about how it will land for you.",
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
      "Granddaddy Purple is a flagship California indica, and the name still carries weight on any dispensary shelf. The buds are deep purple, the nose is grape and berry, and the lineage runs back to Purple Urkle and Big Bud. The body stone is heavy and earned, which is why it earns its reputation as a nighttime strain rather than a daytime one. People reach for it when the day is done, when sleep is the goal, or when tension has been building all day. Expect a strong, long-lasting relaxation, a heavy appetite, and a slow fade into sleep.",
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
        "Beautiful purple nugs, grape candy smell. Heavy. I only use it on weekends when I have nowhere to be.",
      ),
      REDDIT_QUOTE(
        "insomnia",
        "Two hits of GDP and I'm asleep in 30 minutes. Nothing else in my rotation has been as consistent.",
      ),
    ],
    redditSources: [
      redditSource(
        "insomnia",
        "Granddaddy Purple for sleep, what's your dose?",
        "Two hits and I'm out within 30 minutes. Most consistent sleep strain I've tried.",
        142,
      ),
    ],
  },
  tailored: {
    sections: [
      {
        heading: "Overview",
        body: "Granddaddy Purple (GDP) is one of the most recognized indica names on dispensary shelves. The grape-and-berry terpene profile is distinctive: if you open a jar and it reminds you of candy, it is almost certainly this lineage.\n\nIt is a heavy strain. The THC ceiling, around 23%, is moderate by modern standards, but the body stone is what people remember, and it is what makes the strain work for sleep. Plan your evening around it rather than trying to fit it into the middle of a busy day.\n\nThe flavor follows the smell all the way through, so expect a sweet, grape-like exhale rather than the diesel or fruit notes most hybrids lean toward.\n\nWhat you get with GDP is depth rather than brightness. The high settles in, stays heavy, and lasts well past the point where lighter strains have finished.",
      },
      {
        heading: "What it might do for you",
        body: "Insomnia is the use case GDP is most famous for. People with PTSD, restless legs, or chronic pain that flares at night tend to rate it highly, because the relaxation extends past your head into your limbs instead of staying in your thoughts.\n\nIf your main need is evening pain relief that doubles as a sleep aid, GDP is a strong pick. The body heaviness arrives quickly and the mental noise quiets down with it.\n\nIt is much less useful for daytime symptom control. Most people report clear sedation that makes working, driving, or socializing difficult within an hour of dosing, so this is not the strain to reach for before a shift or a meeting.\n\nOne caution worth naming: if you take sleep aids, sedating medications, or benzodiazepines, the combination can be more than additive. Talk to your prescriber before stacking them, and mention cannabis when you do.",
      },
      {
        heading: "What to expect",
        body: "Effects come on slowly and linger. Plan a six to eight hour window before anything that requires full alertness, and if you are dosing in the evening, keep the night clear of anything you have to wake up for.\n\nDry mouth is close to universal, so keep water within reach. The hunger effect is real and genuinely useful if appetite loss is part of what you are trying to fix, so keep some food on hand before you dose rather than after.\n\nStart with less than you think you need. Most people do well with one small bowl in the evening, and the high is forgiving of a second round only if you wait for the first one to settle.\n\nIf you are on sleep aids or sedating medications, talk to your doctor before combining them. The result can be more than additive.",
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
      "Sour Diesel is a landmark East Coast sativa and the strain most experienced users reach for when they need to be awake and engaged. The aroma is sharp and unmistakable, fuel and lemon with almost no sweetness to soften it. The onset is fast, often within minutes, and the high is cerebral, talkative, and long-lasting compared with most sativas. People use it in the morning to push through fog and to stay locked into deep work. Expect dry mouth, a possible heart rate increase in the first half hour, and an appetite that can disappear entirely.",
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
    sideEffects: ["Dry mouth", "Dry eyes", "Anxiety if you are THC-sensitive"],
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
        "Sour Diesel for focus, anyone else using it as a productivity tool?",
        "Clean focus without the jitters. Real deep-work hours instead of tab-switching.",
        156,
      ),
    ],
  },
  tailored: {
    sections: [
      {
        heading: "Overview",
        body: 'Sour Diesel (or "Sour D") is a sativa that defines what people mean when they say "head high." The Limonene-dominant terpene profile gives it a sharp citrus-diesel smell that people either love or find overwhelming, and it does not soften as the session goes on.\n\nEffects come on within minutes. This is one of the faster-onset sativas on the market, and it is also one of the longer-lasting, often running three hours or more before it fades into the back of your mind.\n\nWhat you get is energy in the head rather than weight in the body. It clears fog, sharpens focus, and makes you want to talk. That is exactly what makes it useful when you have something to get done, and exactly what makes it a poor choice when you are trying to quiet down.\n\nThe fuel smell clings to everything, so plan your evening around it. It is the most recognizable aroma in the room and it lasts as long as the high does.',
      },
      {
        heading: "What it might do for you",
        body: "ADHD, fatigue, and depression are the symptoms most often improved in patient reviews. The focus boost is real but it is not stimulant-like: people describe it as the resistance to starting a task simply disappearing.\n\nFor depression, the lift is closer to clarity than to euphoria. You get a little more room between you and your own thoughts, which is often what people are actually looking for.\n\nFor migraines, timing matters. People report the best results when they catch the migraine early. Once it has locked in, even Sour Diesel will not undo it.\n\nIf your fatigue is the symptom, expect this to feel like a switch rather than a ramp. It is a strain for the start of a task, not for the end of a long day.",
      },
      {
        heading: "What to expect",
        body: "Fast onset, strong cerebral effects, and a possible heart rate increase in the first 30 minutes. If you are anxiety-prone, start with one small hit and wait, because this strain amplifies existing anxiety in some people.\n\nThe diesel aroma lingers on your hands and in the room. Plan around that.\n\nIt can suppress your appetite rather than stimulate it, which makes it useful if you would rather not deal with the munchies, and a poor fit if appetite loss is one of the things you are trying to correct.\n\nBecause it is energizing rather than sedating, this is not a night strain. Dosing it late tends to cost you sleep rather than deliver it.",
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
      "Jack Herer is a Dutch classic named after the cannabis-activist and author Jack Herer, and one of the most awarded strains in cannabis cup history. It is the strain people reach for when they want to think rather than check out. The aroma is herbal and floral with a pine edge, noticeably different from the diesel and citrus notes most sativas lean on. The high is functional and clear, with a creative lift that can run for three hours or more. Expect dry mouth, mild jitteriness if you overdo it, and no heavy body weight at all.",
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
    sideEffects: [
      "Dry mouth",
      "Dry eyes",
      "Mild anxiety if you are THC-sensitive",
    ],
    medicalUses: [
      "ADHD",
      "Fatigue",
      "Depression",
      "Stress",
      "Inflammation",
      "Migraine",
    ],
    leaflyRating: 4.5,
    leaflyReviewCount: 7_320,
    communityNotes: [
      LEAFLY_REVIEW(
        "Jack Herer",
        "The thinking strain. I write my best work on it, clear-headed without the racing heart of Sour Diesel.",
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
        body: "Jack Herer is the sativa most often recommended when someone says they want to think, not get high. The Terpinolene-dominant terpene profile gives it an herbal and floral aroma that is noticeably different from the diesel or citrus notes most sativas lean on.\n\nIt has won multiple Cannabis Cup awards for a reason: the high is functional, clear, and long-lasting. You feel alert and creative without the fog or the heaviness, which is unusual for something this potent.\n\nThe creative lift is the part people come back for. It tends to loosen the way you approach a task, which is why it shows up on so many morning routines for people managing ADHD.\n\nWhat you do not get is a body high. If you are looking for relaxation or sleep, this is the wrong tool, and it can leave you wired rather than settled.",
      },
      {
        heading: "What it might do for you",
        body: "ADHD and depression top the patient-reported list. Unlike stimulant medications, Jack Herer does not force focus on you: it removes the friction around starting a task and staying with it, which is often the part that never gets done.\n\nFor people with anxiety who cannot tolerate most sativas, Jack Herer is often the exception. The lack of Limonene-heavy citrus notes seems to make it easier to sit with, where strains like Sour Diesel feel too edgy.\n\nFor depression, people describe a lift that is closer to clarity than to happiness. It gives you a bit more room to work with, and it does not come with the heaviness that most strains used for mood bring with them.\n\nIt is not a treatment for anything, and if your symptoms are severe enough that they are disrupting your days, talk to your clinician rather than tuning a strain.",
      },
      {
        heading: "What to expect",
        body: "Onset is moderate. You feel it in about 10 to 15 minutes, plateau around the 45-minute mark, and the effects taper gradually over two to three hours.\n\nDry mouth is the most common side effect. Paranoia is rare but possible at higher doses, and jitteriness is more likely than a crash.\n\nIt is not a sleep aid and it is not a couch-lock strain. If you dose late in the evening, expect to still be alert three to four hours later, which is a fair trade for the daytime clarity if that is what you need it for.\n\nOne small bowl is a reasonable first move. You can always take more, and the peak is long enough that there is no need to front-load the session.",
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
      "Gelato is a modern dessert strain hybrid out of the Bay Area, crossed from Sunset Sherbet and Thin Mint Girl Scout Cookies. The aroma is sweet and creamy, closer to dessert than to the funk most hybrids carry, and the terpene concentration sits at the high end of what is on the market. The high is balanced but leans slightly indica, with a mood lift up front and a slow wave of body relaxation behind it. People reach for it in the evening when stress is the problem and an edible or a heavy indica would be too much. Expect dry mouth, a gentle appetite effect, and couch-lock if you overshoot.",
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
    sideEffects: ["Dry mouth", "Dry eyes", "Couch-lock at higher doses"],
    medicalUses: [
      "Stress",
      "Anxiety",
      "Depression",
      "PTSD",
      "Nausea & appetite",
    ],
    leaflyRating: 4.6,
    leaflyReviewCount: 8_140,
    communityNotes: [
      LEAFLY_REVIEW(
        "Gelato",
        "Strong but balanced. Mood lifts quickly and the body relaxation sneaks up on you, perfect for evenings when pain is creeping in.",
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
        body: "Gelato (sometimes called \"Larry Bird\" in older cuts) is a slightly indica-leaning hybrid famous for two things: its dessert-sweet aroma and its high THC ceiling. Most cuts test between 20% and 25%.\n\nThe Linalool content is unusually high for a popular commercial strain. Linalool is the terpene most associated with calming, slightly sedative effects, and it is what gives Gelato its evening-friendlier reputation compared with other hybrids at the same THC level.\n\nThe aroma is the first thing people notice, a creamy, almost fruity sweetness that does not fade as the session goes on. It is a strain you can smell from the next room.\n\nWhat makes it useful in the evening is the order of effects. The mood lifts first and the body relaxation follows, so you feel better before you feel heavy.",
      },
      {
        heading: "What it might do for you",
        body: "Stress, anxiety, and PTSD are the symptoms where Gelato consistently outperforms in patient reviews. The high is mood-lifting and body-relaxing without crossing into full sedation at normal doses.\n\nFor pain it is useful but not as targeted as a pure indica. Think more about wanting to feel less wound up than about needing pain control in order to function.\n\nIf appetite is part of what you are trying to fix, expect a gentle hunger effect about 90 minutes in: useful, not overwhelming.\n\nThe one place it falls short is daytime use. The relaxation arrives even if you did not ask for it, so if you need to drive, work, or stay sharp through the afternoon, this is the wrong hour for it.",
      },
      {
        heading: "What to expect",
        body: "Onset is fast, 5 to 10 minutes, but the high is a slow build. Body relaxation arrives 30 to 45 minutes in, and the whole thing runs 2 to 3 hours.\n\nAt moderate doses the effect stays functional enough for low-key evening activities. At higher doses expect couch-lock, so plan accordingly and keep the night clear of anything you have to be alert for.\n\nThe THC ceiling is high, so if you are sensitive, start with one hit and wait the full half hour before deciding whether you want more.\n\nDry mouth is common, the appetite effect tends to arrive on the late side, and a glass of water next to you saves you some trouble.",
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
      "Northern Lights is a pure indica legend and the baseline other indicas get measured against. It comes from late-1970s Pacific Northwest breeding, the Afghani crossed with Thai, and it has been a Dutch coffee-shop staple since the 1980s. The aroma is earthy and pine-heavy rather than sweet, which is usually how you tell it apart from the fruitier strains on the same shelf. The body stone arrives fast, settles deep, and is the reason people keep coming back to it for sleep. Expect a heavy, long-lasting relaxation, a strong appetite, and dry mouth.",
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
        body: "Northern Lights is the reference indica: the strain other indicas are compared against. It comes out of late-1970s Pacific Northwest breeding, the Afghani crossed with Thai, and it has been a Dutch coffee-shop staple since the 1980s.\n\nThe aroma is earthy and pine-heavy rather than sweet, and that is often how you tell it apart on a shelf. If you are after candy or fruit notes, there are better choices.\n\nThe body stone is the whole point. It arrives quickly, moves from your shoulders down through your legs, and stays there for hours, which is why this strain has survived three decades of breeding.\n\nIt is not a subtle experience. Northern Lights is heavy, it is long-lasting, and it is not the strain to reach for when you need to be sharp.",
      },
      {
        heading: "What it might do for you",
        body: "Insomnia, chronic pain, and PTSD-driven sleep disruption are the symptoms Northern Lights is most often praised for. The Myrcene content is on the high side, which is why the body relaxation is so pronounced.\n\nFor anxiety, it works through sedation rather than through a direct calming effect. It settles you by removing the energy that fuels anxiety, not by addressing the thought patterns themselves, so expect the relief to arrive with the weight rather than on its own.\n\nIf pain is what brings you here, the relief usually comes with the relaxation rather than before it, so give it time to build.\n\nIt is not a daytime strain for almost anyone. Plan around it.",
      },
      {
        heading: "What to expect",
        body: "Onset is fast for an indica: within about 10 minutes you feel the body drop. For most people sleep follows within 60 to 90 minutes.\n\nDry mouth is close to universal, so keep water nearby. The hunger effect kicks in around the 90-minute mark, which is useful if appetite is part of what you are dealing with and unhelpful if it is not.\n\nThe high runs six to eight hours for many people, so plan the whole night rather than the first hour of it.\n\nIf you are on benzodiazepines, sleep aids, or muscle relaxants, the combination can be more than additive. Talk to your prescriber before stacking them, and say plainly that you use cannabis.",
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
export function getFeaturedStrainProfile(
  slug: string,
): StrainProfile | undefined {
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

package ai.strainease.app.data

import ai.strainease.app.models.CommunityNote
import ai.strainease.app.models.RecommendationResult
import ai.strainease.app.models.StrainEffect
import ai.strainease.app.models.StrainProfile
import ai.strainease.app.models.StrainRecommendation
import ai.strainease.app.models.Terpene
import ai.strainease.app.models.StrainType

/**
 * Sample data used by Compose `@Preview` annotations and
 * screenshot tests. The iOS `PreviewData.swift` is the source of
 * truth — these fixtures match the iOS samples field-for-field so
 * the same preview snapshots can be compared across platforms.
 */

val SampleGranddaddyPurple = StrainProfile(
    name = "Granddaddy Purple",
    inKnowledgeBase = true,
    type = StrainType.Indica,
    thcRange = "17–23%",
    cbdRange = "<1%",
    lineage = "Purple Urkle × Big Bud",
    terpenes = listOf(
        Terpene(name = "Myrcene", profile = "Earthy grape"),
        Terpene(name = "Caryophyllene", profile = "Pepper"),
        Terpene(name = "Pinene", profile = "Pine"),
    ),
    medicalUses = listOf("Insomnia", "Chronic pain", "Stress"),
    effects = listOf(
        StrainEffect(name = "Relaxed", intensity = 5),
        StrainEffect(name = "Sleepy", intensity = 4),
        StrainEffect(name = "Happy", intensity = 3),
    ),
    sideEffects = listOf("Dry mouth", "Dry eyes"),
    description = "Granddaddy Purple is a flagship California indica, and the name still carries weight on any dispensary shelf. The buds are deep purple, the nose is grape and berry, and the lineage runs back to Purple Urkle and Big Bud. The body stone is heavy and earned, which is why it earns its reputation as a nighttime strain rather than a daytime one. People reach for it when the day is done, when sleep is the goal, or when tension has been building all day. Expect a strong, long-lasting relaxation, a heavy appetite, and a slow fade into sleep.",
    communityNotes = listOf(
        CommunityNote(source = "Leafly review · sleepseeker", text = "Two hits and my back finally quieted down enough to sleep."),
        CommunityNote(source = "Reddit · r/trees", text = "GDP knocks me out in the best way after a long pain day."),
    ),
    leaflyRating = 4.5,
    leaflyReviewCount = 3201,
    weedmapsRating = 4.3,
    weedmapsReviewCount = 612,
    allbudRating = 4.6,
    allbudReviewCount = 84,
)

val SampleBlueDream = StrainProfile(
    name = "Blue Dream",
    inKnowledgeBase = true,
    type = StrainType.Hybrid,
    thcRange = "17–24%",
    cbdRange = "<1%",
    lineage = "Blueberry × Haze",
    terpenes = listOf(
        Terpene(name = "Myrcene", profile = "Earthy"),
        Terpene(name = "Pinene", profile = "Pine"),
    ),
    medicalUses = listOf("Chronic pain", "Depression", "Stress"),
    effects = listOf(
        StrainEffect(name = "Uplifted", intensity = 4),
        StrainEffect(name = "Relaxed", intensity = 3),
        StrainEffect(name = "Creative", intensity = 3),
    ),
    sideEffects = listOf("Dry mouth"),
    description = "Blue Dream is a sativa-leaning hybrid from California and the most searched strain on the market for good reason. It pairs a sweet berry aroma with a light herbal finish on the exhale, which makes it easy to pick out of a jar from across the room. The high is gentle and cerebral, with a soft body ease that settles in without pinning you to the couch. Most people reach for it during the day because the effects stay functional, and it is often the first flower people try when stronger weed leaves them anxious or sleepy. Expect a steady mood lift, a mild body buzz, and dry mouth as the most common complaint.",
    communityNotes = listOf(
        CommunityNote(source = "Leafly review · daytime", text = "Keeps me functional for chronic pain without gluing me to the couch."),
    ),
    leaflyRating = 4.3,
    leaflyReviewCount = 14919,
    weedmapsRating = 4.1,
    weedmapsReviewCount = 2403,
)

val SampleRecommendation: RecommendationResult = RecommendationResult(
    headline = "Granddaddy Purple is the calmer night pick.",
    summary = "For insomnia with an evening window, a heavier indica is the safer first try. Blue Dream stays on the list if you also need daytime function.",
    recommendations = listOf(
        StrainRecommendation(
            strainName = "Granddaddy Purple",
            reason = "Patients consistently report body heaviness and easier sleep onset.",
            bestFor = "Evening wind-down when pain is also in the mix",
            caution = "Start low. It can be stronger than it smells.",
        ),
        StrainRecommendation(
            strainName = "Blue Dream",
            reason = "Gentler hybrid that still shows up in pain and stress reports.",
            bestFor = "Patients who also need to function the next morning",
            caution = "Some people find the Haze side a bit racy at night.",
        ),
    ),
    strains = listOf(SampleGranddaddyPurple, SampleBlueDream),
    resultId = "preview",
)

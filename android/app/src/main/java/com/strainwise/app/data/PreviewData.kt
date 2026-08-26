package com.strainwise.app.data

import com.strainwise.app.models.CommunityNote
import com.strainwise.app.models.RecommendationResult
import com.strainwise.app.models.StrainEffect
import com.strainwise.app.models.StrainProfile
import com.strainwise.app.models.StrainRecommendation
import com.strainwise.app.models.Terpene
import com.strainwise.app.models.StrainType

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
    description = "A classic indica known for grape-scented body calm that helps patients ease into sleep.",
    communityNotes = listOf(
        CommunityNote(source = "Leafly review · sleepseeker", text = "Two hits and my back finally quieted down enough to sleep."),
        CommunityNote(source = "Reddit · r/trees", text = "GDP knocks me out in the best way after a long pain day."),
    ),
    leaflyRating = 4.5,
    leaflyReviewCount = 3201,
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
    description = "A balanced hybrid patients often reach for when they need relief without being glued to the couch.",
    communityNotes = listOf(
        CommunityNote(source = "Leafly review · daytime", text = "Keeps me functional for chronic pain without gluing me to the couch."),
    ),
    leaflyRating = 4.3,
    leaflyReviewCount = 14919,
)

val SampleRecommendation: RecommendationResult = RecommendationResult(
    headline = "Granddaddy Purple is the calmer night pick.",
    summary = "For insomnia with an evening window, a heavier indica is the safer first try. Blue Dream stays on the list if you also need daytime function.",
    recommendations = listOf(
        StrainRecommendation(
            strainName = "Granddaddy Purple",
            reason = "Patients consistently report body heaviness and easier sleep onset.",
            bestFor = "Evening wind-down when pain is also in the mix",
            caution = "Start low — it can be stronger than it smells.",
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

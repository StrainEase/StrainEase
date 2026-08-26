package com.strainwise.app.ui.browse

import com.strainwise.app.models.Conditions
import com.strainwise.app.models.StrainProfile
import com.strainwise.app.models.StrainType

/**
 * Search + type / THC / effect filters for the popular
 * catalog. 1:1 port of the iOS `DirectoryFilter.swift` /
 * web `src/components/directory/StrainDirectory.tsx`.
 */
object DirectoryFilter {

    enum class TypeFilter(val label: String, val strainType: StrainType?) {
        All("All types", null),
        Sativa("Sativa", StrainType.Sativa),
        Hybrid("Hybrid", StrainType.Hybrid),
        Indica("Indica", StrainType.Indica);
    }

    enum class ThcBand(val label: String, val rangeLabel: String) {
        Any("Any THC", "no preference"),
        Mild("Mild", "under ~15%"),
        Balanced("Balanced", "~15-22%"),
        Strong("Strong", "above ~22%");

        fun contains(midpoint: Double): Boolean = when (this) {
            Any -> true
            Mild -> midpoint < 15
            Balanced -> midpoint >= 15 && midpoint < 22
            Strong -> midpoint >= 22
        }
    }

    data class EffectBucket(
        val id: String,
        val label: String,
        val keywords: List<String>,
    ) {
        companion object {
            val Relaxing = EffectBucket("relaxed", "Relaxing", listOf("relaxed", "calm", "calming", "soothing"))
            val Sleepy = EffectBucket("sleepy", "Sleepy", listOf("sleepy", "sedated", "drowsy"))
            val Happy = EffectBucket("happy", "Happy", listOf("happy", "euphoric", "uplifted", "giggly"))
            val Focused = EffectBucket("focused", "Focused", listOf("focused", "creative", "aroused"))
            val Energetic = EffectBucket("energetic", "Energetic", listOf("energetic", "tingly", "talkative"))
            val Hungry = EffectBucket("hungry", "Hungry", listOf("hungry", "appetite"))

            val all: List<EffectBucket> = listOf(Relaxing, Sleepy, Happy, Focused, Energetic, Hungry)

            fun named(id: String): EffectBucket? = all.firstOrNull { it.id == id }
        }
    }

    /** Parse a Leafly-style THC range (`"17-24%"`, `"~20%"`, `"<1%"`)
     *  to a numeric midpoint. En-dashes (U+2013) and em-dashes
     *  (U+2014) are treated as hyphens. */
    fun thcMidpoint(range: String?): Double? {
        if (range.isNullOrEmpty()) return null
        val normalized = range
            .replace("\u2013", "-")
            .replace("\u2014", "-")
        val stripped = normalized
            .replace(Regex("[%~\\s<>]"), "")
            .trim()
        if (stripped.isEmpty()) return null

        if (normalized.contains("<")) {
            val digits = stripped.replace(Regex("[^0-9.]"), "")
            val n = digits.toDoubleOrNull() ?: return null
            return maxOf(0.0, n - 0.5)
        }

        val parts = stripped.split("-")
        if (parts.size == 2) {
            val a = parts[0].toDoubleOrNull() ?: return null
            val b = parts[1].toDoubleOrNull() ?: return null
            return (a + b) / 2
        }
        return stripped.toDoubleOrNull()
    }

    fun matches(profile: StrainProfile, bucket: EffectBucket): Boolean {
        val names = (profile.effects ?: emptyList()).map { it.name.lowercase() }.toSet()
        return bucket.keywords.any { names.contains(it) }
    }

    fun matches(
        profile: StrainProfile,
        query: String = "",
        type: TypeFilter = TypeFilter.All,
        thc: ThcBand = ThcBand.Any,
        effectIDs: List<String> = emptyList(),
        ailments: List<String> = emptyList(),
    ): Boolean {
        type.strainType?.let { wanted ->
            if (profile.type != wanted) return false
        }
        val q = query.trim().lowercase()
        if (q.isNotEmpty() && !profile.name.lowercase().contains(q)) return false
        if (thc != ThcBand.Any) {
            val mid = thcMidpoint(profile.thcRange) ?: return false
            if (!thc.contains(mid)) return false
        }
        val buckets = effectIDs.mapNotNull { EffectBucket.named(it) }
        if (buckets.isNotEmpty() && !buckets.all { matches(profile, it) }) return false
        if (ailments.isNotEmpty() && !ailments.all { matchesCondition(it, profile.medicalUses ?: emptyList()) }) {
            return false
        }
        return true
    }

    fun apply(
        profiles: List<StrainProfile>,
        query: String,
        type: TypeFilter,
        thc: ThcBand,
        effectIDs: List<String>,
        ailments: List<String> = emptyList(),
    ): List<StrainProfile> = profiles.filter {
        matches(it, query, type, thc, effectIDs, ailments)
    }

    fun matchesCondition(ailment: String, uses: List<String>): Boolean {
        if (ailment.isEmpty() || uses.isEmpty()) return false
        val keys = Conditions.matchKeys(ailment).map { it.lowercase() }
        return uses.any { use -> keys.contains(use.lowercase()) }
    }
}

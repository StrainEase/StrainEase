package ai.strainease.app.data

/**
 * Curated terpene profile data, mirrored from
 * `ios/StrainEase/Strain/TerpeneProfile.swift` and
 * `src/lib/terpenes.ts` on web so the strain card and the
 * drill-down sheet show the same copy on every platform.
 *
 * 8 curated profiles; lookup is case-insensitive on the terpene
 * name. Keep entries in sync with the iOS / web data — the Dr.
 * Kaya prompts reference these too.
 */
data class TerpeneProfile(
    val summary: String,
    val description: String,
    val characteristics: List<String>,
    val benefits: List<String>,
)

object TerpeneCatalog {
    val profiles: Map<String, TerpeneProfile> = mapOf(
        "myrcene" to TerpeneProfile(
            summary = "Earthy. Often linked with body heaviness and easier sleep.",
            description = "One of the most common terpenes in cannabis. Patients describe a heavy, settling body feel and report it most in evening strains.",
            characteristics = listOf("Earthy", "Musky", "Herbal"),
            benefits = listOf("Sleep", "Body relaxation", "Muscle tension"),
        ),
        "limonene" to TerpeneProfile(
            summary = "Citrus. Commonly described as mood-lifting and daytime-friendly.",
            description = "Found in citrus peels. Patients often describe a brighter, more upbeat head and reach for limonene-forward strains during the day.",
            characteristics = listOf("Citrus", "Bright", "Sweet"),
            benefits = listOf("Mood", "Daytime focus", "Stress"),
        ),
        "caryophyllene" to TerpeneProfile(
            summary = "Peppery. Patients often mention it for stress and body tension.",
            description = "Also found in black pepper and cloves. Patients report it pairs well with stress relief and tight muscles. It binds the CB2 receptor directly, which is unusual for a terpene.",
            characteristics = listOf("Peppery", "Spicy", "Warm"),
            benefits = listOf("Stress", "Body tension", "Inflammation"),
        ),
        "pinene" to TerpeneProfile(
            summary = "Pine. Associated with a clearer, more alert head.",
            description = "Pine trees and rosemary carry it. Patients often reach for pinene-forward strains when they want a clearer head during the day.",
            characteristics = listOf("Pine", "Fresh", "Crisp"),
            benefits = listOf("Alertness", "Daytime focus", "Memory"),
        ),
        "linalool" to TerpeneProfile(
            summary = "Floral. Frequently reported as calming.",
            description = "Lavender's main terpene. Patients often pair it with evening use, racing thoughts, or winding-down rituals.",
            characteristics = listOf("Floral", "Soft", "Sweet"),
            benefits = listOf("Calm", "Sleep", "Anxiety"),
        ),
        "terpinolene" to TerpeneProfile(
            summary = "Herbal-citrus. Often a brighter, more stimulating profile.",
            description = "Less common but distinctive. Patients describe a more uplifting, heady effect than the body-heavy feel of myrcene.",
            characteristics = listOf("Herbal", "Citrus", "Piney"),
            benefits = listOf("Uplift", "Creativity", "Energy"),
        ),
        "humulene" to TerpeneProfile(
            summary = "Hoppy. Sometimes noted as appetite-dampening.",
            description = "Same family as hops. A small group of patients report it dampens appetite, though most notice it for the woody, herbal aroma.",
            characteristics = listOf("Hoppy", "Woody", "Earthy"),
            benefits = listOf("Appetite regulation", "Body relaxation"),
        ),
        "ocimene" to TerpeneProfile(
            summary = "Sweet-herbal. Usually described as uplifting.",
            description = "Found in mint, basil, and mango. Patients describe a sweet, uplifting lift that pairs well with social or creative daytime use.",
            characteristics = listOf("Sweet", "Herbal", "Woody"),
            benefits = listOf("Uplift", "Mood", "Energy"),
        ),
    )

    val allNames: List<String> = profiles.keys.sorted()

    fun profileFor(name: String): TerpeneProfile? {
        val key = name.trim().lowercase()
        return profiles[key]
    }

    fun isCurated(name: String): Boolean = profileFor(name) != null

    /** URL-safe slug for the terpene. Mirrors iOS / web rules. */
    fun slugFor(name: String): String =
        name
            .trim()
            .lowercase()
            .replace(Regex("[^a-z0-9]+"), "-")
            .trim('-')

    /**
     * Filter a strain list to those that include the given terpene
     * (case-insensitive on the terpene name). Strains with a
     * richer profile (full `terpenes` list) take precedence over
     * the popular-list stubs that don't carry terpenes yet — we
     * still include those, marked accordingly.
     */
    fun strainsWithTerpene(
        terpene: String,
        strains: List<ai.strainease.app.models.StrainProfile>,
    ): Pair<List<ai.strainease.app.models.StrainProfile>, List<ai.strainease.app.models.StrainProfile>> {
        val target = terpene.trim().lowercase()
        val withProfile = mutableListOf<ai.strainease.app.models.StrainProfile>()
        val withoutTerpene = mutableListOf<ai.strainease.app.models.StrainProfile>()
        for (strain in strains) {
            val names = (strain.terpenes ?: emptyList()).map { it.name.lowercase() }
            if (names.contains(target)) withProfile += strain
            else withoutTerpene += strain
        }
        return withProfile to withoutTerpene
    }
}

package ai.strainease.app.data

import android.content.Context
import ai.strainease.app.models.Conditions
import ai.strainease.app.models.StrainProfile
import ai.strainease.app.models.StrainType
import kotlinx.serialization.Serializable

/**
 * Curated + directory strain catalog. The same merge logic the iOS
 * `StrainCatalog` uses to make sure the Home rails always have
 * 6+ strains per type and ailment, even when the live popular list
 * is short or missing a phenotype.
 *
 * Two sources feed the merged catalog:
 *   - [curated]   — 24 hand-picked strains, each with the medical
 *                   uses list hard-coded
 *   - [directory] — the bundled `strain-directory.json` asset
 *                   (Leafly + Weedmaps dump, ~600 entries)
 *
 * The merge:
 *   1. concatenates the two lists
 *   2. de-dupes by slug, preferring whichever row has a non-null
 *      `imageUrl` / `medicalUses` / `type` / `thcRange`
 *   3. applies the curated [photos] map so the catalog row wins
 *      over a stale live URL
 */
object StrainCatalog {

    @Serializable
    private data class DirectoryEntry(
        val name: String,
        val type: StrainType,
        val thc: String = "",
        val uses: List<String> = emptyList(),
        val imageUrl: String? = null,
    )

    /** The full merged catalog (curated + directory). */
    val all: List<StrainProfile> by lazy { unique(curated + directory).map(::applyKnownPhoto) }

    /** Merge a live `popularStrains` response into the catalog. */
    fun merge(
        live: List<StrainProfile>,
        preferringType: StrainType? = null,
    ): List<StrainProfile> {
        val extras = all.filter { catalog ->
            if (preferringType != null && catalog.type != preferringType) return@filter false
            live.none { it.slug == catalog.slug }
        }
        val head = if (preferringType == null) live else live.filter { it.type == preferringType }
        return applyingCatalogPhotos(unique(head + extras))
    }

    /** Strains from the catalog + live list that match an ailment. */
    fun matching(ailment: String, live: List<StrainProfile>): List<StrainProfile> {
        val combined = unique(live + all)
        val hits = combined.filter { matches(it, ailment) }
        val list = if (hits.isEmpty()) combined.take(8) else hits
        return applyingCatalogPhotos(list)
    }

    /** Strains that match the most saved ailments, scored by
     *  coverage. Empty list when [ailments] is empty. */
    fun matching(
        ailments: List<String>,
        live: List<StrainProfile>,
        limit: Int = 6,
    ): List<StrainProfile> {
        val cleaned = ailments.map { it.trim() }.filter { it.isNotEmpty() }
        if (cleaned.isEmpty()) return emptyList()
        val combined = unique(live + all)
        val scored: List<Pair<StrainProfile, Int>> = combined.mapNotNull { profile ->
            val score = cleaned.count { matches(profile, it) }
            if (score > 0) profile to score else null
        }
        val sorted = scored.sortedWith(
            compareByDescending<Pair<StrainProfile, Int>> { it.second }
                .thenBy { it.first.name.lowercase() },
        )
        return applyingCatalogPhotos(sorted.take(limit).map { it.first })
    }

    fun applyingCatalogPhotos(profiles: List<StrainProfile>): List<StrainProfile> =
        profiles.map(::applyingCatalogPhoto)

    fun applyingCatalogPhoto(profile: StrainProfile): StrainProfile =
        withCatalogPhoto(profile)

    fun unique(profiles: List<StrainProfile>): List<StrainProfile> {
        val seen = mutableMapOf<String, StrainProfile>()
        val order = mutableListOf<String>()
        for (profile in profiles) {
            if (profile.name.isEmpty()) continue
            val slug = profile.slug
            val existing = seen[slug]
            if (existing != null) {
                var next = existing
                if ((next.imageUrl.isNullOrEmpty()) && !profile.imageUrl.isNullOrEmpty()) {
                    next = next.copy(imageUrl = profile.imageUrl)
                }
                if ((next.medicalUses.isNullOrEmpty()) && !profile.medicalUses.isNullOrEmpty()) {
                    next = next.copy(medicalUses = profile.medicalUses)
                }
                if (next.type == null && profile.type != null) {
                    next = next.copy(type = profile.type)
                }
                if (next.thcRange == null && profile.thcRange != null) {
                    next = next.copy(thcRange = profile.thcRange)
                }
                seen[slug] = next
            } else {
                seen[slug] = profile
                order.add(slug)
            }
        }
        return order.mapNotNull { seen[it] }
    }

    fun matches(profile: StrainProfile, ailment: String): Boolean {
        val keys = Conditions.matchKeys(ailment)
        return profile.medicalUses?.any { use ->
            keys.any { it.equals(use, ignoreCase = true) }
        } == true
    }

    // ---- Private helpers ----

    private fun withCatalogPhoto(profile: StrainProfile): StrainProfile {
        var next = applyKnownPhoto(profile)
        val key = photoKey(profile.slug)
        if (next.medicalUses.isNullOrEmpty()) {
            val uses = all.firstOrNull { it.slug == key }?.medicalUses
            if (!uses.isNullOrEmpty()) {
                next = next.copy(medicalUses = uses)
            }
        }
        return next
    }

    private fun applyKnownPhoto(profile: StrainProfile): StrainProfile {
        val key = photoKey(profile.slug)
        val known = photos[key] ?: return profile
        return profile.copy(imageUrl = known)
    }

    private fun photoKey(slug: String): String = slugAliases[slug] ?: slug

    private val slugAliases: Map<String, String> = mapOf(
        "gsc" to "girl-scout-cookies",
        "gg4" to "gorilla-glue",
        "gg-4" to "gorilla-glue",
        "original-glue" to "gorilla-glue",
    )

    private val photos: Map<String, String> = mapOf(
        "blue-dream" to "https://images.leafly.com/flower-images/blue-dream.png",
        "granddaddy-purple" to "https://images.leafly.com/flower-images/granddaddy-purple.png",
        "sour-diesel" to "https://leafly-public.imgix.net/strains/photos/5SPDG4T4TcSO8PgLgWHO_SourDiesel_AdobeStock_171888473.jpg",
        "jack-herer" to "https://images.leafly.com/flower-images/jack-herer.jpg",
        "gelato" to "https://images.leafly.com/flower-images/gelato.jpg",
        "northern-lights" to "https://images.leafly.com/flower-images/northern-lights.png",
        "og-kush" to "https://images.leafly.com/flower-images/og-kush.png",
        "green-crack" to "https://images.leafly.com/flower-images/green-crack.png",
        "bubba-kush" to "https://images.leafly.com/flower-images/bubba-kush.png",
        "wedding-cake" to "https://leafly-public.imgix.net/strains/photos/m2y50HYRBu0dHY4JSdSx_wedding-cake_jman.jpg",
        "durban-poison" to "https://images.leafly.com/flower-images/durban-poison.jpg",
        "purple-punch" to "https://images.leafly.com/flower-images/purple-punch-fixed.jpg",
        "gorilla-glue" to "https://images.leafly.com/flower-images/gg-4.jpg",
        "super-lemon-haze" to "https://leafly-public.imgix.net/strains/photos/QRio3lTnO1PsVFx8Sxw1_super-lemon-haze_jman.jpg",
        "9-pound-hammer" to "https://leafly-public.imgix.net/strains/photos/dN680700Rbqf10ZWl54R_9-pound-hammer_jman.jpg",
        "girl-scout-cookies" to "https://images.leafly.com/flower-images/gsc.png",
        "strawberry-cough" to "https://images.leafly.com/flower-images/strawberry-cough.png",
        "hindu-kush" to "https://images.leafly.com/flower-images/defaults/generic/strain-13.png",
        "white-widow" to "https://images.leafly.com/flower-images/white-widow.png",
        "pineapple-express" to "https://images.leafly.com/flower-images/pineapple-express.png",
        "gmo-cookies" to "https://images.leafly.com/flower-images/defaults/red-orange-amber/strain-2.png",
        "super-silver-haze" to "https://images.leafly.com/flower-images/super-silver-haze.png",
        "skywalker-og" to "https://images.leafly.com/flower-images/defaults/long-fluffy-wispy/strain-2.png",
        "tangie" to "https://leafly-public.imgix.net/strains/photos/8wTMziz0RQaJqNE4juPn_Tangie.png",
    )

    /** Hand-curated set so the Home rails never run dry. The
     *  medical uses lists are tuned by the StrainEase editorial
     *  team; the live `popularStrains` response fills in the
     *  `imageUrl` and any other fields when available. */
    private val curated: List<StrainProfile> = listOf(
        entry("Blue Dream", StrainType.Hybrid, "17–24%",
            listOf("Chronic pain", "Depression", "Stress", "Fatigue", "Inflammation", "Arthritis")),
        entry("Granddaddy Purple", StrainType.Indica, "17–23%",
            listOf("Insomnia", "Chronic pain", "Muscle spasm", "Stress", "PTSD", "Anxiety")),
        entry("Sour Diesel", StrainType.Sativa, "19–24%",
            listOf("ADHD", "Stress", "Depression", "Chronic pain", "Fatigue", "Migraine")),
        entry("Jack Herer", StrainType.Sativa, "18–23%",
            listOf("ADHD", "Fatigue", "Depression", "Stress", "Inflammation", "Migraine")),
        entry("Gelato", StrainType.Hybrid, "20–25%",
            listOf("Stress", "Anxiety", "Depression", "PTSD", "Nausea & appetite")),
        entry("Northern Lights", StrainType.Indica, "16–21%",
            listOf("Insomnia", "Chronic pain", "Stress", "Anxiety", "PTSD", "Inflammation")),
        entry("OG Kush", StrainType.Hybrid, "19–26%",
            listOf("Chronic pain", "Stress", "Nausea & appetite", "Migraine", "Arthritis", "Muscle spasm")),
        entry("Green Crack", StrainType.Sativa, "15–25%",
            listOf("ADHD", "Fatigue", "Stress", "Depression", "Migraine", "Anxiety")),
        entry("Bubba Kush", StrainType.Indica, "14–22%",
            listOf("Insomnia", "Chronic pain", "Muscle spasm", "Arthritis", "PTSD", "Nausea & appetite")),
        entry("Wedding Cake", StrainType.Hybrid, "20–25%",
            listOf("Anxiety", "Stress", "Depression", "PTSD", "Inflammation")),
        entry("Durban Poison", StrainType.Sativa, "15–25%",
            listOf("ADHD", "Fatigue", "Depression", "Stress", "Migraine")),
        entry("Purple Punch", StrainType.Indica, "18–20%",
            listOf("Insomnia", "Anxiety", "Nausea & appetite", "Stress", "Arthritis")),
        entry("Gorilla Glue", StrainType.Hybrid, "20–28%",
            listOf("Chronic pain", "Stress", "Insomnia", "Inflammation")),
        entry("Super Lemon Haze", StrainType.Sativa, "17–25%",
            listOf("ADHD", "Fatigue", "Depression", "Stress")),
        entry("9 Pound Hammer", StrainType.Indica, "18–23%",
            listOf("Insomnia", "Chronic pain", "Muscle spasm", "Arthritis")),
        entry("Girl Scout Cookies", StrainType.Hybrid, "17–28%",
            listOf("Chronic pain", "Nausea & appetite", "Stress", "Anxiety")),
        entry("Strawberry Cough", StrainType.Sativa, "15–22%",
            listOf("ADHD", "Fatigue", "Stress", "Anxiety")),
        entry("Hindu Kush", StrainType.Indica, "15–20%",
            listOf("Chronic pain", "Insomnia", "Inflammation", "Arthritis", "Muscle spasm")),
        entry("White Widow", StrainType.Hybrid, "18–25%",
            listOf("Stress", "Depression", "Inflammation", "Migraine", "Arthritis")),
        entry("Pineapple Express", StrainType.Hybrid, "15–25%",
            listOf("ADHD", "Depression", "Fatigue", "Stress")),
        entry("GMO Cookies", StrainType.Indica, "20–28%",
            listOf("Insomnia", "Nausea & appetite", "Chronic pain", "Muscle spasm")),
        entry("Super Silver Haze", StrainType.Sativa, "16–23%",
            listOf("ADHD", "Fatigue", "Depression", "Stress")),
        entry("Skywalker OG", StrainType.Indica, "18–26%",
            listOf("Insomnia", "Chronic pain", "PTSD", "Stress")),
        entry("Tangie", StrainType.Sativa, "17–22%",
            listOf("ADHD", "Fatigue", "Depression", "Stress")),
    )

    private fun entry(
        name: String,
        type: StrainType,
        thc: String,
        uses: List<String>,
    ): StrainProfile = withCatalogPhoto(
        StrainProfile(
            name = name,
            inKnowledgeBase = true,
            type = type,
            thcRange = thc,
            medicalUses = uses,
        ),
    )

    /** Lazily-loaded directory parsed from `assets/strain-directory.json`. */
    private val directory: List<StrainProfile> by lazy { loadDirectory() }

    private fun loadDirectory(): List<StrainProfile> {
        val json = try {
            val appCtx = appContext ?: return emptyList()
            appCtx.assets.open("strain-directory.json").use { input ->
                kotlinx.serialization.json.Json {
                    ignoreUnknownKeys = true
                }.decodeFromString(
                    kotlinx.serialization.builtins.ListSerializer(DirectoryEntry.serializer()),
                    input.bufferedReader().readText(),
                )
            }
        } catch (t: Throwable) {
            android.util.Log.w("StrainCatalog", "strain-directory.json missing or invalid: ${t.message}")
            return emptyList()
        }
        return json.mapNotNull { row ->
            val name = row.name.trim()
            if (name.isEmpty()) return@mapNotNull null
            StrainProfile(
                name = name,
                inKnowledgeBase = true,
                type = row.type,
                thcRange = row.thc.takeIf { it.isNotEmpty() },
                medicalUses = row.uses.takeIf { it.isNotEmpty() },
                imageUrl = row.imageUrl,
            )
        }
    }

    /** Set once at app start via [init]. The catalog loader needs
     *  the application context to read bundled assets, but a
     *  singleton has no good place to grab it — the Application
     *  class calls [init] in `onCreate`. */
    @Volatile
    private var appContext: Context? = null

    fun init(context: Context) {
        appContext = context.applicationContext
    }
}

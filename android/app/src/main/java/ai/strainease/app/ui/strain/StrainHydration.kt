package ai.strainease.app.ui.strain

import ai.strainease.app.models.StrainProfile

/**
 * Sections of a strain profile that may still need to be
 * fetched from the backend on first open. 1:1 port of the
 * iOS `StrainHydration.swift` enum.
 *
 * The Home rails carry "partial" StrainProfiles with only
 * name + type + THC + medical uses; the detail screen calls
 * StrainAPI.search(name) once on open and patches the missing
 * sections back into the local copy.
 *
 * Each section carries:
 *  - [title] — the eyebrow label rendered above the card
 *  - [caption] — the short rotating status text shown while
 *    the section is being fetched
 *  - [placeholderLines] — how many skeleton bars to draw
 *    inside the card; the last one is capped at ~45% width
 *    so it reads as "real text" rather than a uniform block
 */
enum class StrainHydrationSection(
    val title: String,
    val caption: String,
    val placeholderLines: Int,
) {
    Description(
        title = "Overview",
        caption = "Researching this strain…",
        placeholderLines = 3,
    ),
    Lineage(
        title = "Lineage",
        caption = "Looking up parent strains…",
        placeholderLines = 1,
    ),
    Uses(
        title = "Commonly used for",
        caption = "Collecting commonly reported uses…",
        placeholderLines = 2,
    ),
    Effects(
        title = "Effects",
        caption = "Pulling reported effects…",
        placeholderLines = 4,
    ),
    Terpenes(
        title = "Terpenes",
        caption = "Reading the terpene profile…",
        placeholderLines = 2,
    ),
    SideEffects(
        title = "Watch for",
        caption = "Checking commonly reported side effects…",
        placeholderLines = 2,
    ),
    Community(
        title = "Community voices",
        caption = "Pulling Leafly reviews and Reddit comments…",
        placeholderLines = 3,
    ),
}

/**
 * Sections that still need the live lookup before they have
 * content. Mirrors the iOS
 * `StrainProfile.pendingHydrationSections` so the Android
 * detail page can show a placeholder for each missing slot
 * while `search(name)` is in flight.
 */
val StrainProfile.pendingHydrationSections: Set<StrainHydrationSection>
    get() = buildSet {
        if (description.isNullOrEmpty()) add(StrainHydrationSection.Description)
        if (lineage.isNullOrEmpty()) add(StrainHydrationSection.Lineage)
        if (medicalUses.isNullOrEmpty()) add(StrainHydrationSection.Uses)
        if (effects.isNullOrEmpty()) add(StrainHydrationSection.Effects)
        if (terpenes.isNullOrEmpty()) add(StrainHydrationSection.Terpenes)
        if (sideEffects.isNullOrEmpty()) add(StrainHydrationSection.SideEffects)
        if (quoteNotes.isEmpty() && resolvedCommunityRatings.isEmpty()) {
            add(StrainHydrationSection.Community)
        }
    }

/** Returns a copy of this profile with [sections] filled in
 *  from [other], leaving existing fields untouched.
 *
 *  The "section in sections" guard covers the fields the user
 *  might have already curated locally (description, lineage,
 *  uses, effects, terpenes, side effects). Community data is
 *  treated differently: the fresh search() payload is the
 *  source of truth, so `communityNotes` + the per-source
 *  ratings are always overwritten when the fresh profile has
 *  them — even if `.Community` is not in [sections]. Mirrors
 *  the iOS `profile = full` pattern: a home-rail stub that
 *  ships with a Leafly rating but no quote notes still picks
 *  up the new Reddit / weed-site reviews the search() call
 *  surfaces, instead of staying blank.
 */
fun StrainProfile.copyHydratedFrom(
    other: StrainProfile,
    sections: Set<StrainHydrationSection>,
): StrainProfile = copy(
    description = if (StrainHydrationSection.Description in sections && other.description != null) other.description else description,
    // Defensive: only fill in lineage if the stub doesn't already
    // have one. A caller that passes `.Lineage` in [sections] for a
    // stub with a populated lineage shouldn't silently lose the
    // local value to whatever the fresh payload returned. Mirrors
    // the original Android copyHydratedFrom lineage guard.
    lineage = if (StrainHydrationSection.Lineage in sections && other.lineage != null && lineage == null) other.lineage else lineage,
    type = if (type == null) other.type else type,
    medicalUses = if (StrainHydrationSection.Uses in sections && other.medicalUses != null) other.medicalUses else medicalUses,
    effects = if (StrainHydrationSection.Effects in sections && other.effects != null) other.effects else effects,
    terpenes = if (StrainHydrationSection.Terpenes in sections && other.terpenes != null) other.terpenes else terpenes,
    sideEffects = if (StrainHydrationSection.SideEffects in sections && other.sideEffects != null) other.sideEffects else sideEffects,
    // Community data: always pull from the fresh payload when
    // available. A stub that already carries a Leafly rating
    // but no quote notes (the home-rail common case) used to
    // skip this branch because `.Community` was never added
    // to the pending set, so the merged profile kept
    // `communityNotes = null` and CommunityVoicesSection
    // rendered as "No reviews yet." Now the fresh notes win.
    communityNotes = other.communityNotes ?: communityNotes,
    // Per-source rating cards: the fresh payload wins when it
    // has them so a stub that ships with only a Leafly rating
    // picks up the Weedmaps / Allbud ratings and review
    // counts the search() call surfaces.
    leaflyRating = other.leaflyRating ?: leaflyRating,
    leaflyReviewCount = other.leaflyReviewCount ?: leaflyReviewCount,
    weedmapsRating = other.weedmapsRating ?: weedmapsRating,
    weedmapsReviewCount = other.weedmapsReviewCount ?: weedmapsReviewCount,
    allbudRating = other.allbudRating ?: allbudRating,
    allbudReviewCount = other.allbudReviewCount ?: allbudReviewCount,
    imageUrl = imageUrl ?: other.imageUrl,
)

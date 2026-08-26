package com.strainwise.app.ui.strain

import com.strainwise.app.models.StrainProfile
import com.strainwise.app.models.StrainType

/**
 * Sections of a strain profile that may still need to be
 * fetched from the backend on first open. 1:1 port of the
 * iOS `StrainHydration.swift` enum.
 *
 * The Home rails carry "partial" StrainProfiles with only
 * name + type + THC + medical uses; the detail screen calls
 * StrainAPI.search(name) once on open and patches the missing
 * sections back into the local copy.
 */
enum class StrainHydrationSection {
    Description,
    DayNight,
    Uses,
    Effects,
    Terpenes,
    SideEffects,
    Community,
}

val StrainProfile.pendingHydrationSections: Set<StrainHydrationSection>
    get() = buildSet {
        if (description.isNullOrEmpty()) add(StrainHydrationSection.Description)
        if (lineage == null && type == null) add(StrainHydrationSection.DayNight)
        if (medicalUses.isNullOrEmpty()) add(StrainHydrationSection.Uses)
        if (effects.isNullOrEmpty()) add(StrainHydrationSection.Effects)
        if (terpenes.isNullOrEmpty()) add(StrainHydrationSection.Terpenes)
        if (sideEffects.isNullOrEmpty()) add(StrainHydrationSection.SideEffects)
        if (communityNotes.isNullOrEmpty()) add(StrainHydrationSection.Community)
    }

/** Returns a copy of this profile with [sections] filled in
 *  from [other], leaving existing fields untouched. */
fun StrainProfile.copyHydratedFrom(
    other: StrainProfile,
    sections: Set<StrainHydrationSection>,
): StrainProfile = copy(
    description = if (StrainHydrationSection.Description in sections && other.description != null) other.description else description,
    lineage = if (lineage == null) other.lineage else lineage,
    type = if (type == null) other.type else type,
    medicalUses = if (StrainHydrationSection.Uses in sections && other.medicalUses != null) other.medicalUses else medicalUses,
    effects = if (StrainHydrationSection.Effects in sections && other.effects != null) other.effects else effects,
    terpenes = if (StrainHydrationSection.Terpenes in sections && other.terpenes != null) other.terpenes else terpenes,
    sideEffects = if (StrainHydrationSection.SideEffects in sections && other.sideEffects != null) other.sideEffects else sideEffects,
    communityNotes = if (StrainHydrationSection.Community in sections && other.communityNotes != null) other.communityNotes else communityNotes,
    imageUrl = imageUrl ?: other.imageUrl,
    leaflyRating = leaflyRating ?: other.leaflyRating,
    leaflyReviewCount = leaflyReviewCount ?: other.leaflyReviewCount,
)

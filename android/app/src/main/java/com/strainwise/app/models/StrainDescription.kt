package com.strainwise.app.models

import kotlinx.serialization.Serializable

/**
 * One section of the patient-tailored strain description returned
 * by the `describeStrainForUser` callable. Always rendered as a
 * small block with an eyebrow heading and a prose body.
 */
@Serializable
data class StrainDescriptionSection(
    val heading: String,
    val body: String,
)

/** Result shape for the `elaborateSection` callable — a single
 *  short prose expansion of one of the three tailored-description
 *  sections, written for this strain and the caller's saved
 *  ailments / medications / relief-log history. */
@Serializable
data class ElaboratedSection(
    val elaboration: String,
)

/**
 * Three-section, patient-tailored description for a single strain.
 * Always exactly three sections:
 *   - "Overview"
 *   - "What it might do for you"
 *   - "What to expect"
 *
 * Mirrors the iOS `StrainDescription` struct, including the
 * `precondition(sections.count == 3)` invariant from the Swift
 * initializer.
 */
@Serializable
data class StrainDescription(
    val sections: List<StrainDescriptionSection>,
) {
    init {
        require(sections.size == 3) {
            "StrainDescription must have exactly 3 sections, got ${sections.size}"
        }
    }

    val overview: StrainDescriptionSection get() = sections[0]
    val tailored: StrainDescriptionSection get() = sections[1]
    val expectations: StrainDescriptionSection get() = sections[2]
}

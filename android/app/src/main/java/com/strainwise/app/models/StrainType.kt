package com.strainwise.app.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Strain type taxonomy. Direct port of the iOS
 * `enum StrainType: String, Codable`. The wire format
 * (`"indica"` / `"sativa"` / `"hybrid"`) is the same on every
 * surface — web, iOS, Android — so the backend's per-source
 * `type` field passes through untouched.
 *
 *  - Indica: typically associated with evening / body-heavy use
 *  - Sativa: typically associated with daytime / cerebral use
 *  - Hybrid: cross of the two, no dominant lean
 *
 * `Hybrid` is the default fallback when the type is missing or
 * unrecognized, mirroring the iOS
 * `TypeStyle.color(for:)` behavior.
 *
 * Wire format mapping: each variant carries an explicit
 * `@SerialName` so kotlinx.serialization round-trips the
 * backend's lowercase strings instead of failing with
 * "does not contain element with name 'hybrid'". The iOS
 * `CodingKeys` does the same on Swift's side.
 */
@Serializable
enum class StrainType {
    @SerialName("indica")
    Indica,

    @SerialName("sativa")
    Sativa,

    @SerialName("hybrid")
    Hybrid;

    /** Raw wire value, lowercase, matches the backend. */
    val wire: String get() = name.lowercase()

    companion object {
        /** Parse a backend string into a [StrainType]. Unknown / null
         *  values resolve to null so the caller can fall back to the
         *  default branch (i.e. "Hybrid" / "Strain"). */
        fun parse(raw: String?): StrainType? = when (raw?.lowercase()) {
            "indica" -> Indica
            "sativa" -> Sativa
            "hybrid" -> Hybrid
            else -> null
        }
    }
}

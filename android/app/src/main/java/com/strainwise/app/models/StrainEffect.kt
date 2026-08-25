package com.strainwise.app.models

import kotlinx.serialization.Serializable

/**
 * A reported effect from a strain's `effects` list. The `intensity`
 * is a 0..5 scale that drives the `IntensityBar` on the strain
 * detail screen.
 */
@Serializable
data class StrainEffect(
    val name: String,
    val intensity: Int,
)

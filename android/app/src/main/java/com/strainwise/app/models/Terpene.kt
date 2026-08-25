package com.strainwise.app.models

import kotlinx.serialization.Serializable

/**
 * One terpene in a strain's `terpenes` list. Mirrors the iOS
 * `Terpene` struct (name + a one-line profile blurb).
 */
@Serializable
data class Terpene(
    val name: String,
    val profile: String,
)

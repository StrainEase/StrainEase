package com.strainwise.app.models

import android.net.Uri
import kotlinx.serialization.Serializable

/**
 * A medical-marijuana doctor / clinic scraped from Leafly's public
 * doctors directory. Direct port of the iOS `Doctor` struct.
 */
@Serializable
data class Doctor(
    val id: String,
    val name: String,
    val slug: String,
    val url: String,
    val street: String,
    val city: String,
    val state: String,
    val zip: String,
    val lat: Double? = null,
    val lon: Double? = null,
    /** Distance from the caller's coordinates in miles. Null when
     *  no coordinates were provided. */
    val distanceMi: Double? = null,
    val rating: Double? = null,
    val reviewCount: Int? = null,
    val reviewSnippet: String? = null,
    val logoUrl: String? = null,
    val timezone: String? = null,
) {
    /** Single-line address: "2909 Sheridan Blvd, Wheat Ridge, CO, 80214". */
    val addressLine: String
        get() = listOf(street, city, state, zip)
            .filter { it.isNotEmpty() }
            .joinToString(", ")

    /** Apple-Maps-style URL (works on iOS; on Android, the system
     *  browser opens it through the geo: URI fallback). The `q`
     *  param doubles as a search fallback when lat/lon is missing. */
    val mapsUri: Uri?
        get() = buildString {
            append("https://maps.apple.com/?")
            val params = if (lat != null && lon != null) {
                "ll=$lat,$lon&q=${Uri.encode(name)}"
            } else {
                val q = listOf(name, street, city, state, zip)
                    .filter { it.isNotEmpty() }
                    .joinToString(", ")
                "q=${Uri.encode(q)}"
            }
            append(params)
        }.let { Uri.parse(it) }

    companion object {
        val SampleDoctor = Doctor(
            id = "305123",
            name = "Doc Morrison",
            slug = "doc-morrison",
            url = "https://www.leafly.com/doctors/doc-morrison",
            street = "2909 Sheridan Blvd",
            city = "Wheat Ridge",
            state = "CO",
            zip = "80214",
            lat = 39.7589363,
            lon = -105.0535268,
            distanceMi = 4.2,
            rating = 4.7,
            reviewCount = 12,
            reviewSnippet = "Friendly staff, easy visit.",
            logoUrl = null,
            timezone = "America/Denver",
        )
    }
}

/**
 * Resolved location for a doctor search. When the user supplies
 * coordinates the backend echoes them back so the UI can show
 * "Showing results near 39.74, -105.00" with the right
 * precision.
 */
@Serializable
data class DoctorResolvedLocation(
    val city: String,
    val state: String,
    val lat: Double,
    val lon: Double,
)

/** Free-form query for the `findDoctors` callable. */
@Serializable
data class DoctorQuery(
    val lat: Double? = null,
    val lon: Double? = null,
    val city: String? = null,
    val state: String? = null,
    val zip: String? = null,
    val radiusMiles: Double? = null,
) {
    val isEmpty: Boolean
        get() = lat == null
            && lon == null
            && (city.isNullOrEmpty())
            && (state.isNullOrEmpty())
            && (zip.isNullOrEmpty())
}

/** Result of a `findDoctors` call. */
@Serializable
data class DoctorResult(
    val doctors: List<Doctor>,
    val resolvedLocation: DoctorResolvedLocation? = null,
    val source: String,
)

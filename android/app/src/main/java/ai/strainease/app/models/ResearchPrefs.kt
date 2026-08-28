package ai.strainease.app.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Time of day the patient is researching for. Mirrors the iOS
 * `TimeOfDay` enum. The wire value is the lowercase raw string.
 */
@Serializable
enum class TimeOfDay(val wire: String) {
    @SerialName("anytime")
    Anytime("anytime"),
    @SerialName("morning")
    Morning("morning"),
    @SerialName("afternoon")
    Afternoon("afternoon"),
    @SerialName("night")
    Night("night");

    val label: String
        get() = when (this) {
            Anytime -> "Anytime"
            Morning -> "Morning"
            Afternoon -> "Afternoon"
            Night -> "Night"
        }

    companion object {
        fun parse(raw: String?): TimeOfDay? = entries.firstOrNull { it.wire == raw?.lowercase() }
    }
}

/**
 * Form the patient prefers to consume in. Mirrors the iOS
 * `ConsumeForm` enum.
 */
@Serializable
enum class ConsumeForm(val wire: String) {
    @SerialName("any")
    Any("any"),
    @SerialName("flower")
    Flower("flower"),
    @SerialName("cart")
    Cart("cart"),
    @SerialName("edible")
    Edible("edible"),
    @SerialName("tincture")
    Tincture("tincture");

    val label: String
        get() = when (this) {
            Any -> "Any"
            Flower -> "Flower"
            Cart -> "Cart"
            Edible -> "Edible"
            Tincture -> "Tincture"
        }

    companion object {
        fun parse(raw: String?): ConsumeForm? = entries.firstOrNull { it.wire == raw?.lowercase() }
    }
}

/**
 * THC sensitivity. The wire value for [AnxiousHighThc] uses the
 * iOS raw string `"anxious-high-thc"` (kebab-case) so the backend
 * stays in sync with the web client.
 */
@Serializable
enum class ThcSensitivity(val wire: String) {
    @SerialName("typical")
    Typical("typical"),
    @SerialName("anxious-high-thc")
    AnxiousHighThc("anxious-high-thc"),
    @SerialName("experienced")
    Experienced("experienced");

    val label: String
        get() = when (this) {
            Typical -> "Typical"
            AnxiousHighThc -> "THC-sensitive"
            Experienced -> "Experienced"
        }

    val hint: String?
        get() = when (this) {
            Typical -> null
            AnxiousHighThc -> "High THC can make me anxious"
            Experienced -> "I tolerate stronger flower"
        }

    companion object {
        fun parse(raw: String?): ThcSensitivity? =
            entries.firstOrNull { it.wire == raw?.lowercase() }
    }
}

/**
 * Potency preference, expressed as a THC bracket. The wire value
 * for [Any] is the empty string (matching the iOS
 * `Potency.any = ""` raw value).
 */
@Serializable
enum class Potency(val wire: String) {
    @SerialName("")
    Any(""),
    @SerialName("mild")
    Mild("mild"),
    @SerialName("balanced")
    Balanced("balanced"),
    @SerialName("strong")
    Strong("strong");

    val label: String
        get() = when (this) {
            Any -> "Any"
            Mild -> "Mild"
            Balanced -> "Balanced"
            Strong -> "Strong"
        }

    val hint: String
        get() = when (this) {
            Any -> "No preference"
            Mild -> "THC under ~15%"
            Balanced -> "THC 15–22%"
            Strong -> "THC above ~22%"
        }

    companion object {
        fun parse(raw: String?): Potency? =
            entries.firstOrNull { it.wire == (raw ?: "").lowercase() }
    }
}

/**
 * Optional context the patient fills in on the Find screen. The
 * `compacted` shape drops default / empty fields so the callable
 * payload matches the web `compactPrefs` output.
 */
@Serializable
data class ResearchPrefs(
    val timeOfDay: TimeOfDay = TimeOfDay.Anytime,
    val consumeForm: ConsumeForm = ConsumeForm.Any,
    val thcSensitivity: ThcSensitivity = ThcSensitivity.Typical,
    val medications: String = "",
    val ownedStrainsText: String = "",
    val patientNote: String = "",
) {
    /** Strains the patient already owns, parsed out of [ownedStrainsText]. */
    val ownedStrains: List<String>
        get() = ownedStrainsText
            .split(",")
            .map { it.trim() }
            .filter { it.isNotEmpty() }

    /** Strip defaults / empty fields so the payload matches the
     *  web client's `compactPrefs` shape. The keys are the same
     *  ones `functions/src/index.ts` reads. */
    fun toCompactedMap(reliefSummary: String? = null): Map<String, Any> {
        val out = mutableMapOf<String, Any>()
        if (timeOfDay != TimeOfDay.Anytime) out["timeOfDay"] = timeOfDay.wire
        if (consumeForm != ConsumeForm.Any) out["consumeForm"] = consumeForm.wire
        if (thcSensitivity != ThcSensitivity.Typical) out["thcSensitivity"] = thcSensitivity.wire
        val meds = medications.trim()
        if (meds.isNotEmpty()) out["medications"] = meds.take(240)
        val owned = ownedStrains
        if (owned.isNotEmpty()) out["ownedStrains"] = owned.take(8)
        val note = patientNote.trim()
        if (note.isNotEmpty()) out["patientNote"] = note.take(400)
        if (!reliefSummary.isNullOrEmpty()) {
            out["reliefSummary"] = reliefSummary.take(800)
        }
        return out
    }
}

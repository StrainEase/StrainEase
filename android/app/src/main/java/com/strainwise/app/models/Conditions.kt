package com.strainwise.app.models

/**
 * Static catalog of patient-facing condition / ailment labels.
 * Direct port of the iOS `Conditions` enum.
 *
 * - [catalog] is the full list shown in the Find + Account pickers.
 * - [quick] is the small set shown as quick-pick chips on the Find screen.
 * - [matchKeys] returns the medical-use keys that count as a hit
 *   for a given ailment, so a saved "OCD" matches strains that
 *   list "OCD" or "Anxiety" under medical uses.
 */
object Conditions {
    val catalog: List<String> = listOf(
        "Chronic pain",
        "Anxiety",
        "OCD",
        "ADHD",
        "Insomnia",
        "Depression",
        "Nausea & appetite",
        "Inflammation",
        "Migraine",
        "Muscle spasm",
        "PTSD",
        "Fatigue",
        "Arthritis",
        "Stress",
    )

    val quick: List<String> = listOf(
        "Insomnia",
        "Chronic pain",
        "Anxiety",
        "Migraine",
    )

    /** Keys a strain would need to list under `medicalUses` to count
     *  as a hit for the given saved ailment. */
    fun matchKeys(ailment: String): List<String> {
        val key = ailment.trim()
        return when (key.lowercase()) {
            "ocd" -> listOf("OCD", "Anxiety")
            "adhd" -> listOf("ADHD", "ADD/ADHD", "ADD")
            else -> listOf(key)
        }
    }
}

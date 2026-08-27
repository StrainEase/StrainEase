package ai.strainease.app.ui.strain

import ai.strainease.app.models.StrainProfile
import ai.strainease.app.models.StrainType

/**
 * Day / night score for a strain. Direct port of the iOS
 * `StrainMeaning.swift`. The number is a heuristic on top of
 * the strain's reported effects + type:
 *  - Indica-leaning → higher (more night)
 *  - Sativa-leaning → lower (more day)
 *  - Specific effects (sleepy / relaxed / energetic /
 *    focused / uplifted) push the score up or down.
 */
object StrainMeaning {
    fun dayNightScore(profile: StrainProfile): Int {
        var score = when (profile.type) {
            StrainType.Indica -> 70
            StrainType.Sativa -> 30
            StrainType.Hybrid -> 50
            null -> 50
        }
        profile.effects?.forEach { e ->
            val name = e.name.lowercase()
            val weight = when {
                "sleepy" in name || "sedated" in name -> 10
                "relaxed" in name || "calm" in name -> 5
                "energetic" in name || "focused" in name -> -10
                "uplifted" in name || "creative" in name -> -5
                "happy" in name || "euphoric" in name -> -2
                else -> 0
            }
            score += weight * (e.intensity.coerceIn(1, 5)) / 3
        }
        return score.coerceIn(0, 100)
    }

    /** "Evening-leaning" / "Daytime-leaning" label for a given
     *  day/night score (0..100). */
    fun labelFor(score: Int): String = when (score) {
        in 0..33 -> "Daytime-leaning"
        in 34..66 -> "Anytime"
        else -> "Evening-leaning"
    }
}

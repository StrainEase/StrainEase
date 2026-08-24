package com.strainwise.app.ui.theme

import androidx.compose.ui.graphics.Color
import com.strainwise.app.models.StrainType

/**
 * Strain-type display logic. Direct port of the iOS
 * `Palette.TypeStyle` so the Home rails, strain detail, and Find
 * results all show the same label + color for each strain type.
 *
 * Use [TypeStyle.label] and [TypeStyle.color] everywhere a strain's
 * type is shown — never hardcode "Indica" / "Sativa" / "Hybrid" in a
 * screen, and never read `Palette.IndicaLight` directly. The [label]
 * is the only place these strings live.
 */
object TypeStyle {
    /** Human-readable label for a strain type, e.g. "Indica" / "Sativa"
     *  / "Hybrid" / "Strain" (the fallback when the type is unknown). */
    fun label(type: StrainType?): String = when (type) {
        StrainType.Indica -> "Indica"
        StrainType.Sativa -> "Sativa"
        StrainType.Hybrid -> "Hybrid"
        null -> "Strain"
    }

    /** Brand color for a strain type. Resolves through
     *  [Palette.IndicaLight] / [Palette.SativaLight] / [Palette.HybridLight]
     *  (or their dark variants when the system theme is dark) so the
     *  same chip colors read correctly in both light and dark mode. */
    fun color(type: StrainType?, darkTheme: Boolean): Color = when (type) {
        StrainType.Indica -> if (darkTheme) Palette.IndicaDark else Palette.IndicaLight
        StrainType.Sativa -> if (darkTheme) Palette.SativaDark else Palette.SativaLight
        StrainType.Hybrid -> if (darkTheme) Palette.HybridDark else Palette.HybridLight
        null -> if (darkTheme) Palette.HybridDark else Palette.HybridLight
    }
}

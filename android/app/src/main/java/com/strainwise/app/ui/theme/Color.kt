package com.strainwise.app.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * StrainEase color tokens. Direct port of the iOS `Palette` so both
 * surfaces share one set of color values. The full Material 3
 * `ColorScheme` is built from these in [LightColors] / [DarkColors];
 * the rest of the app should prefer `MaterialTheme.colorScheme.*`
 * over reaching into this object directly.
 *
 * The numeric values come from the iOS `Palette.swift`:
 *   - light: `Color(red:, green:, blue:)` from `(r, g, b)` triples
 *   - dark:  same source, dark variant
 *
 * Anything that is alpha-blended (e.g. `Palette.glowMint`) is exposed
 * as two RGB tokens so Compose can apply the alpha in the gradient
 * builder instead of in the color literal — keeps the swatches
 * identical to the iOS `.opacity(0.42)` / `.opacity(0.28)` figures.
 */
object Palette {
    // Neutrals
    val BackgroundLight = Color(0xFFF6F9F7)
    val BackgroundDark = Color(0xFF0B110D)
    val ForegroundLight = Color(0xFF19251E)
    val ForegroundDark = Color(0xFFE7EDEA)
    val CardLight = Color(0xFFFFFFFF)
    val CardDark = Color(0xFF131A16)

    // Brand
    val PrimaryLight = Color(0xFF01603A)
    val PrimaryDark = Color(0xFF71BE92)
    val OnPrimaryLight = Color(0xFFF9FDFA)
    val OnPrimaryDark = Color(0xFF06100A)

    // Surfaces
    val MutedLight = Color(0xFFEAF3ED)
    val MutedDark = Color(0xFF1F2923)
    val MutedForegroundLight = Color(0xFF57685E)
    val MutedForegroundDark = Color(0xFF8E9C93)
    val AccentLight = Color(0xFFDDF3E5)
    val AccentDark = Color(0xFF1F3327)
    val BorderLight = Color(0xFFDAE1DD)
    val BorderDark = Color(0x26FFFFFF) // 15% white in dark
    val RingLight = Color(0xFF4D916B)
    val RingDark = Color(0xFF4D916B)
    val DestructiveLight = Color(0xFFC7382E)
    val DestructiveDark = Color(0xFFE66652)

    // Strain type colors (mirrors `TypeStyle.color(for:)` in iOS)
    val IndicaLight = Color(0xFFB87A29)
    val IndicaDark = Color(0xFFEBB861)
    val SativaLight = Color(0xFF2E75AD)
    val SativaDark = Color(0xFF7ABDEB)
    val HybridLight = Color(0xFF01603A)
    val HybridDark = Color(0xFF71BE92)

    // Mesh background glows
    val GlowMintLight = Color(0x8CD1A8).copy(alpha = 0.42f) // iOS .opacity(0.42)
    val GlowMintDark = Color(0x479E70).copy(alpha = 0.28f) // iOS .opacity(0.28)
    val GlowDeepLight = Color(0x195C3D).copy(alpha = 0.14f)
    val GlowDeepDark = Color(0x198C52).copy(alpha = 0.22f)
}

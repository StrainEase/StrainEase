package ai.strainease.app.ui.theme

import androidx.compose.ui.unit.dp

/**
 * Shared layout dimension tokens for the StrainEase Android UI.
 *
 * Co-located with [Color], [StrainEaseTypography], and [TypeStyle] so
 * future screens can discover visual tokens in one place (matching
 * how `Palette` lives on iOS).
 */

/**
 * Top inset every primary-tab page applies below the chrome's
 * floating heart / initials buttons.
 *
 * The chrome buttons are 40.dp tall and sit ~12.dp below the
 * status bar; an additional ~12.dp of breathing room keeps the
 * eyebrow row from feeling crowded. All four tabs
 * (Home, Find, Discover, Doctors) consume this same constant
 * — change it here to retune the spacing everywhere at once.
 *
 * Used both as a `.padding(top = PageTopInset, …)` modifier on
 * verticalScroll Columns and as a `PaddingValues(top = PageTopInset, …)`
 * `contentPadding` on LazyVerticalGrids — it's a raw Dp so both
 * surfaces accept it without any wrapping.
 */
val PageTopInset = 64.dp

/**
 * Bottom inset every primary-tab page applies above the bottom
 * tab bar.
 *
 * The Material3 `NavigationBar` is ~80.dp tall; the Scaffold's
 * `contentPadding` already accounts for it, but the
 * `CompareTrayBar` slot above the nav bar is transparent and
 * can shift the visible boundary. Add 32.dp of breathing room
 * so the last content card never feels crammed against the nav
 * bar — enough to read as a clear "page end" without the bottom rail feeling like it's drifting away from the content.
 *
 * The iOS web companion uses `padding-bottom: env(safe-area-inset-bottom, 0px) + 16px`,
 * but Android screens tend to land on visually heavier last
 * sections (e.g. Home's `StrainRail` of Recently Viewed cards),
 * so we sit a hair larger to keep the same perceived breathing
 * room the iOS layout achieves with its lighter endings.
 */
val PageBottomInset = 32.dp

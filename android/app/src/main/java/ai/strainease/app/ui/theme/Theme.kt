package ai.strainease.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

/**
 * The StrainEase Material 3 theme. Single source of truth for the
 * app's color scheme + typography. Always wraps screens; never let
 * Compose defaults leak through.
 *
 * Mirrors the iOS approach of forcing a specific palette per scheme
 * (no dynamic color, no system accent) so the brand reads identically
 * on every device. `dynamicColor` is intentionally not honored.
 */
@Composable
fun StrainEaseTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColors else LightColors

    MaterialTheme(
        colorScheme = colorScheme,
        typography = StrainEaseTypography,
        content = content,
    )
}

private val LightColors = lightColorScheme(
    primary = Palette.PrimaryLight,
    onPrimary = Palette.OnPrimaryLight,
    secondary = Palette.MutedForegroundLight,
    onSecondary = Palette.OnPrimaryLight,
    background = Palette.BackgroundLight,
    onBackground = Palette.ForegroundLight,
    surface = Palette.CardLight,
    onSurface = Palette.ForegroundLight,
    surfaceVariant = Palette.MutedLight,
    onSurfaceVariant = Palette.MutedForegroundLight,
    outline = Palette.BorderLight,
    outlineVariant = Palette.BorderLight,
    error = Palette.DestructiveLight,
    onError = Palette.OnPrimaryLight,
    tertiary = Palette.AccentLight,
    onTertiary = Palette.PrimaryLight,
)

private val DarkColors = darkColorScheme(
    primary = Palette.PrimaryDark,
    onPrimary = Palette.OnPrimaryDark,
    secondary = Palette.MutedForegroundDark,
    onSecondary = Palette.OnPrimaryDark,
    background = Palette.BackgroundDark,
    onBackground = Palette.ForegroundDark,
    surface = Palette.CardDark,
    onSurface = Palette.ForegroundDark,
    surfaceVariant = Palette.MutedDark,
    onSurfaceVariant = Palette.MutedForegroundDark,
    outline = Palette.BorderDark,
    outlineVariant = Palette.BorderDark,
    error = Palette.DestructiveDark,
    onError = Palette.OnPrimaryDark,
    tertiary = Palette.AccentDark,
    onTertiary = Palette.PrimaryDark,
)

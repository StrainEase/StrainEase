package ai.strainease.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import ai.strainease.app.ui.theme.Palette

/**
 * Quiet two-orb mesh background. Mirrors the iOS `MeshBackground`
 * view used by the Home, Find, Browse, Doctors, Strain Detail, and
 * Account screens.
 *
 *  - Top-right orb: glowMint radial, 420dp radius, offset (40, -80)
 *  - Bottom-left orb: glowDeep radial, 380dp radius, offset (-30, 120)
 *  - Dark mode: extra linear gradient bottom-fade at 0.55 alpha
 *
 * No blur on scrolling content — just layered radials. Hit-testing
 * is disabled so the background never intercepts taps.
 */
@Composable
fun MeshBackground(
    modifier: Modifier = Modifier,
) {
    val darkTheme = isSystemInDarkTheme()
    val bg = MaterialTheme.colorScheme.background
    val glowMint = if (darkTheme) Palette.GlowMintDark else Palette.GlowMintLight
    val glowDeep = if (darkTheme) Palette.GlowDeepDark else Palette.GlowDeepLight

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(bg),
    ) {
        // Top-right orb: mint glow from the top-right corner.
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        colors = listOf(glowMint, Color.Transparent),
                        center = androidx.compose.ui.geometry.Offset(1.1f, -0.05f),
                        radius = 750f,
                    ),
                ),
        )
        // Bottom-left orb: deep glow from the bottom-left corner.
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        colors = listOf(glowDeep, Color.Transparent),
                        center = androidx.compose.ui.geometry.Offset(-0.1f, 1.05f),
                        radius = 700f,
                    ),
                ),
        )
        if (darkTheme) {
            // Subtle dark-mode bottom-fade so the orbs don't dominate
            // the navigation bar in dark mode.
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                bg.copy(alpha = 0.55f),
                            ),
                        ),
                    ),
            )
        }
    }
}

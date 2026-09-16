package ai.strainease.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import ai.strainease.app.ui.theme.PageTopInset

/**
 * Top-of-page gradient overlay that fades from the page background
 * color (opaque) down to transparent, so scrolling content can pass
 * underneath without ever feeling like it's clipping against a flat
 * rectangle.
 *
 * Sits inside the page's parent `Box` *after* the scrollable content,
 * so it paints above the content Column/LazyGrid but below the
 * floating chrome (heart / initials) buttons — matches the iOS
 * `TopGradient` overlay used on the same screens.
 *
 *  - Height: 1.5 × [PageTopInset] (96.dp) so the gradient extends
 *    past the chrome's bottom edge — a 64.dp gradient blends
 *    invisibly with the bg-colored mesh below it; 96.dp gives the
 *    fade a visible band the eye can pick up.
 *  - Stops: opaque bg at the top → 70% alpha mid → transparent at
 *    the bottom. The midway 70% stop is what makes the fade
 *    perceptible against the bg mesh glow underneath; pure
 *    `bg → transparent` looks like nothing because the mesh
 *    background is already bg.
 *  - Click-through: the Box paints pixels only; tap targets on the
 *    content above remain tappable through the gradient's lower
 *    band.
 *  - Color: [MaterialTheme.colorScheme.background] so light/dark theme
 *    flips are automatic.
 */
@Composable
fun TopGradientOverlay(
    modifier: Modifier = Modifier,
    height: androidx.compose.ui.unit.Dp = PageTopInset * 3 / 2,
) {
    val bg = MaterialTheme.colorScheme.background
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        bg,
                        bg.copy(alpha = 0.7f),
                        Color.Transparent,
                    ),
                ),
            ),
    )
}
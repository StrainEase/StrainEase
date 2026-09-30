package ai.strainease.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImagePainter
import coil.compose.SubcomposeAsyncImage
import coil.compose.SubcomposeAsyncImageContent
import coil.request.ImageRequest
import ai.strainease.app.models.StrainType
import ai.strainease.app.ui.theme.TypeStyle

/**
 * Strain image with graceful loading and a fallback tier. 1:1 port
 * of the iOS `StrainPhoto` view (PR #252): tries the network
 * image, falls back to an alternate URL when the primary fails,
 * and only renders the type-tinted solid when every source has
 * been exhausted.
 *
 * Behavior:
 *  - With primary URL → Coil's SubcomposeAsyncImage. While the
 *    primary is in flight, renders a spinner. On load, renders
 *    the image. On error, falls through to [fallbackURLString]
 *    if provided.
 *  - With only fallback URL (no primary) → goes straight to the
 *    fallback.
 *  - With no URL → tinted block keyed to [StrainType] so the rail
 *    reads correctly even before images stream in.
 *  - When both the primary and the fallback have failed → tinted
 *    block. The leaf iconography isn't used here because the
 *    Material tinted block already reads as "placeholder" without
 *    needing a glyph; the web leaf icon was a TypeScript-only
 *    addition.
 *
 * The fallback URL is the curated Leafly/Weedmaps direct link
 * from `StrainCatalog.photoURL(for: slug)`, so a dead Firebase
 * Storage URL falls back to the catalog photo instead of leaving
 * the user with a tinted block.
 */
@Composable
fun StrainPhoto(
    urlString: String?,
    type: StrainType?,
    modifier: Modifier = Modifier,
    height: Dp = 132.dp,
    cornerRadius: Dp = 16.dp,
    fallbackURLString: String? = null,
) {
    val darkTheme = isSystemInDarkTheme()
    val tint = TypeStyle.color(type, darkTheme).copy(alpha = 0.14f)
    val hasPrimary = !urlString.isNullOrEmpty()
    val hasFallback = !fallbackURLString.isNullOrEmpty()

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
            .clip(RoundedCornerShape(cornerRadius))
            .background(if (hasPrimary || hasFallback) Color.White else tint),
        contentAlignment = Alignment.Center,
    ) {
        when {
            hasPrimary -> {
                PrimaryPhoto(
                    urlString = urlString!!,
                    fallbackURLString = fallbackURLString,
                    tint = tint,
                    cornerRadius = cornerRadius,
                )
            }
            hasFallback -> {
                FallbackPhoto(
                    fallbackURL = fallbackURLString!!,
                    tint = tint,
                    cornerRadius = cornerRadius,
                )
            }
            // No URL at all: the outer Box's background already paints
            // the type-tinted solid. Nothing to draw on top.
        }
    }
}

/**
 * Tries the primary URL. On failure, swaps to the fallback URL
 * (if any) by flipping a state flag; the [FallbackPhoto] then
 * mounts and reads the same fallback string. This mirrors the
 * iOS `StrainPhotoBody` / `FallbackPhotoView` split.
 */
@Composable
private fun PrimaryPhoto(
    urlString: String,
    fallbackURLString: String?,
    tint: Color,
    cornerRadius: Dp,
) {
    var primaryFailed by remember(urlString, fallbackURLString) {
        mutableStateOf(false)
    }
    if (primaryFailed && !fallbackURLString.isNullOrEmpty()) {
        FallbackPhoto(
            fallbackURL = fallbackURLString,
            tint = tint,
            cornerRadius = cornerRadius,
        )
        return
    }
    if (primaryFailed) {
        // No fallback available — render the tinted block.
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(tint),
            contentAlignment = Alignment.Center,
        ) {}
        return
    }
    SubcomposeAsyncImage(
        model = ImageRequest.Builder(LocalContext.current)
            .data(urlString)
            .crossfade(true)
            .build(),
        contentDescription = null,
        contentScale = ContentScale.Fit,
        modifier = Modifier
            .fillMaxSize()
            .clip(RoundedCornerShape(cornerRadius)),
    ) {
        when (painter.state) {
            is AsyncImagePainter.State.Loading -> {
                CircularProgressIndicator(
                    color = MaterialTheme.colorScheme.primary,
                    strokeWidth = 2.dp,
                    modifier = Modifier.size(20.dp),
                )
            }
            is AsyncImagePainter.State.Error -> {
                // Mark the primary as failed; the next composition
                // (or this very branch) will fall through to the
                // fallback. Done via a state flag rather than
                // immediately swapping in a child composable to
                // avoid re-keying the SubcomposeAsyncImage mid-
                // composition and losing the loading state.
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(tint),
                    contentAlignment = Alignment.Center,
                ) {
                    // LaunchedEffect runs after composition settles,
                    // so the state flip happens cleanly without
                    // recursive recomposition.
                    LaunchedEffect(urlString) {
                        primaryFailed = true
                    }
                    CircularProgressIndicator(
                        color = MaterialTheme.colorScheme.primary,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
            else -> SubcomposeAsyncImageContent()
        }
    }
}

/**
 * Tries the fallback URL. Renders a spinner while loading, the
 * image on success, or the type-tinted block on failure. Critical
 * detail: this composable never flashes the tinted block while a
 * previous good image might still be visible — the calling site
 * decides whether to swap into the fallback in the first place,
 * and the spinner here keeps the user from seeing a half-broken
 * state.
 */
@Composable
private fun FallbackPhoto(
    fallbackURL: String,
    tint: Color,
    cornerRadius: Dp,
) {
    var fallbackFailed by remember(fallbackURL) { mutableStateOf(false) }
    if (fallbackFailed) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(tint),
            contentAlignment = Alignment.Center,
        ) {}
        return
    }
    SubcomposeAsyncImage(
        model = ImageRequest.Builder(LocalContext.current)
            .data(fallbackURL)
            .crossfade(true)
            .build(),
        contentDescription = null,
        contentScale = ContentScale.Fit,
        modifier = Modifier
            .fillMaxSize()
            .clip(RoundedCornerShape(cornerRadius)),
    ) {
        when (painter.state) {
            is AsyncImagePainter.State.Loading -> {
                CircularProgressIndicator(
                    color = MaterialTheme.colorScheme.primary,
                    strokeWidth = 2.dp,
                    modifier = Modifier.size(20.dp),
                )
            }
            is AsyncImagePainter.State.Error -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(tint),
                    contentAlignment = Alignment.Center,
                ) {
                    LaunchedEffect(fallbackURL) {
                        fallbackFailed = true
                    }
                }
            }
            else -> SubcomposeAsyncImageContent()
        }
    }
}

package com.strainwise.app.ui.components

import androidx.compose.foundation.Image
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
import com.strainwise.app.models.StrainType
import com.strainwise.app.ui.theme.TypeStyle

/**
 * Strain image with a tinted fallback. 1:1 port of the iOS
 * `StrainPhoto` view: tries the network image, falls back to a
 * type-tinted solid block when there's no URL or the load
 * failed.
 *
 * Behavior:
 *  - With URL → Coil's SubcomposeAsyncImage; renders a loading
 *    spinner while the request is in flight, then the image
 *    once it loads, and a tinted block on error.
 *  - Without URL → tinted block keyed to [StrainType] (indica
 *    warm, sativa cool, hybrid green) so the rail reads
 *    correctly even before images stream in.
 */
@Composable
fun StrainPhoto(
    urlString: String?,
    type: StrainType?,
    modifier: Modifier = Modifier,
    height: Dp = 132.dp,
    cornerRadius: Dp = 16.dp,
) {
    val darkTheme = isSystemInDarkTheme()
    val tint = TypeStyle.color(type, darkTheme).copy(alpha = 0.14f)
    val hasUrl = !urlString.isNullOrEmpty()

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
            .clip(RoundedCornerShape(cornerRadius))
            .background(if (hasUrl) Color.White else tint),
        contentAlignment = Alignment.Center,
    ) {
        if (hasUrl) {
            SubcomposeAsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(urlString)
                    .crossfade(true)
                    .build(),
                contentDescription = null,
                contentScale = ContentScale.Crop,
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
                        // Fall back to the type-tinted block on error
                        Box(modifier = Modifier.fillMaxSize().background(tint))
                    }
                    else -> SubcomposeAsyncImageContent()
                }
            }
        }
        // No-URL branch: the outer Box's background already paints
        // the type-tinted solid. Nothing to draw on top.
    }
}

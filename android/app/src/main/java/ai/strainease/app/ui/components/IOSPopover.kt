package ai.strainease.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.boundsInWindow
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.IntRect
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupPositionProvider
import androidx.compose.ui.window.PopupProperties

/**
 * Vertical side of the anchor the popover should appear on. [Auto]
 * tries [Below] first and flips to [Above] when the preferred side
 * would clip the window.
 */
enum class PopoverPlacement { Auto, Below, Above }

/**
 * iOS-style popover for Android Compose.
 *
 * Wraps an anchor composable and floats a rounded card with an
 * arrow tail above or below it when [expanded] is true. No drag
 * handle, no bottom-sheet chrome: the popover looks like a UIKit
 * popover rendered on Android.
 *
 * Usage:
 * ```
 * var infoOpen by remember { mutableStateOf(false) }
 * IOSPopover(
 *     expanded = infoOpen,
 *     onDismissRequest = { infoOpen = false },
 * ) {
 *     IconButton(onClick = { infoOpen = true }) {
 *         Icon(Icons.Filled.Info, contentDescription = "Help")
 *     }
 * } popover = {
 *     Text("What this card means for the patient.")
 * }
 * ```
 *
 * The anchor is wrapped in a small container that records its
 * window-space bounds via [onGloballyPositioned]. The [Popup] uses
 * a custom [PopupPositionProvider] that reads those bounds each
 * frame, so the popover stays anchored when the parent scrolls,
 * rotates, or resizes.
 */
@Composable
fun IOSPopover(
    expanded: Boolean,
    onDismissRequest: () -> Unit,
    placement: PopoverPlacement = PopoverPlacement.Auto,
    anchorAlignment: Alignment.Horizontal = Alignment.CenterHorizontally,
    arrowTipXRatio: Float = 0.5f,
    popoverMaxWidth: Dp = 280.dp,
    popover: @Composable ColumnScope.() -> Unit,
    anchor: @Composable () -> Unit,
) {
    var anchorBoundsInWindow by remember { mutableStateOf(IntRect.Zero) }
    val density = LocalDensity.current
    val gapPx = with(density) { 6.dp.toPx() }.toInt()
    val arrowHeight = 8.dp
    val arrowWidth = 14.dp

    Box {
        Box(
            modifier = Modifier.onGloballyPositioned { coords ->
                val r = coords.boundsInWindow()
                anchorBoundsInWindow = IntRect(
                    left = r.left.toInt(),
                    top = r.top.toInt(),
                    right = r.right.toInt(),
                    bottom = r.bottom.toInt(),
                )
            },
        ) {
            anchor()
        }

        if (expanded) {
            val positionProvider = remember(
                anchorBoundsInWindow,
                anchorAlignment,
                gapPx,
            ) {
                object : PopupPositionProvider {
                    override fun calculatePosition(
                        anchorBounds: IntRect,
                        windowSize: IntSize,
                        layoutDirection: androidx.compose.ui.unit.LayoutDirection,
                        popupContentSize: IntSize,
                    ): IntOffset = computeOffset(
                        anchorBounds = anchorBounds,
                        windowSize = windowSize,
                        popupSize = popupContentSize,
                        requested = placement,
                        horizontal = anchorAlignment,
                        gapPx = gapPx,
                    )
                }
            }
            Popup(
                popupPositionProvider = positionProvider,
                onDismissRequest = onDismissRequest,
                properties = PopupProperties(
                    focusable = true,
                    dismissOnClickOutside = true,
                    dismissOnBackPress = true,
                ),
            ) {
                val resolved = if (placement == PopoverPlacement.Above) {
                    PopoverPlacement.Above
                } else {
                    PopoverPlacement.Below
                }
                PopoverSurface(
                    placement = resolved,
                    arrowTipXRatio = arrowTipXRatio.coerceIn(0.15f, 0.85f),
                    arrowHeight = arrowHeight,
                    arrowWidth = arrowWidth,
                    maxWidth = popoverMaxWidth,
                    content = popover,
                )
            }
        }
    }
}

/**
 * Computes the popup's top-left offset. The popup's measured size
 * includes the arrow, so the body of the popover sits flush against
 * the anchor after the offset is applied.
 */
private fun computeOffset(
    anchorBounds: IntRect,
    windowSize: IntSize,
    popupSize: IntSize,
    requested: PopoverPlacement,
    horizontal: Alignment.Horizontal,
    gapPx: Int,
): IntOffset {
    val bodyWidth = popupSize.width
    val (x, yBelow) = when (horizontal) {
        Alignment.Start -> anchorBounds.left to anchorBounds.bottom + gapPx
        Alignment.End -> (anchorBounds.right - bodyWidth) to anchorBounds.bottom + gapPx
        else -> {
            val centerX = anchorBounds.left + (anchorBounds.width / 2)
            (centerX - bodyWidth / 2) to anchorBounds.bottom + gapPx
        }
    }
    val fitsBelow = yBelow + popupSize.height <= windowSize.height
    val effective = when (requested) {
        PopoverPlacement.Above -> PopoverPlacement.Above
        PopoverPlacement.Below -> PopoverPlacement.Below
        PopoverPlacement.Auto -> if (fitsBelow) PopoverPlacement.Below else PopoverPlacement.Above
    }
    val y = when (effective) {
        PopoverPlacement.Below -> yBelow
        PopoverPlacement.Above -> anchorBounds.top - popupSize.height - gapPx
        PopoverPlacement.Auto -> yBelow
    }
    return IntOffset(x.coerceAtLeast(0), y.coerceAtLeast(0))
}

/**
 * Renders the popover body (rounded card) plus the arrow tail as
 * a separate Canvas triangle just outside the card's edge. The
 * arrow uses the same surface color as the card so the two read as
 * one shape. The card has an 8dp shadow + 1dp border to lift it off
 * the screen like a real iOS popover.
 */
@Composable
private fun PopoverSurface(
    placement: PopoverPlacement,
    arrowTipXRatio: Float,
    arrowHeight: Dp,
    arrowWidth: Dp,
    maxWidth: Dp,
    content: @Composable ColumnScope.() -> Unit,
) {
    val surface = MaterialTheme.colorScheme.surface
    val border = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.18f)
    val shape = RoundedCornerShape(14.dp)
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (placement == PopoverPlacement.Above) {
            Arrow(
                tipDown = true,
                arrowWidth = arrowWidth,
                arrowHeight = arrowHeight,
                tipXRatio = arrowTipXRatio,
                fill = surface,
                stroke = border,
            )
        }
        Column(
            modifier = Modifier
                .widthIn(max = maxWidth)
                .shadow(elevation = 8.dp, shape = shape, clip = false)
                .clip(shape)
                .background(surface)
                .border(1.dp, border, shape)
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            content()
        }
        if (placement == PopoverPlacement.Below) {
            Arrow(
                tipDown = false,
                arrowWidth = arrowWidth,
                arrowHeight = arrowHeight,
                tipXRatio = arrowTipXRatio,
                fill = surface,
                stroke = border,
            )
        }
    }
}

/**
 * Small triangle tail. Renders a filled Path inside a [Canvas] the
 * size of [arrowWidth] x [arrowHeight]. The tip is positioned at
 * [tipXRatio] of the canvas width (0 = left, 1 = right).
 */
@Composable
private fun Arrow(
    tipDown: Boolean,
    arrowWidth: Dp,
    arrowHeight: Dp,
    tipXRatio: Float,
    fill: Color,
    stroke: Color,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(arrowHeight),
        contentAlignment = Alignment.CenterStart,
    ) {
        Canvas(
            modifier = Modifier.size(arrowWidth, arrowHeight),
        ) {
            val w = size.width
            val h = size.height
            val tipX = w * tipXRatio
            val path = Path().apply {
                if (tipDown) {
                    // Arrow points down (popover is above the anchor).
                    moveTo(0f, 0f)
                    lineTo(w, 0f)
                    lineTo(tipX, h)
                    close()
                } else {
                    // Arrow points up (popover is below the anchor).
                    moveTo(0f, h)
                    lineTo(w, h)
                    lineTo(tipX, 0f)
                    close()
                }
            }
            drawPath(path, fill)
            drawPath(path, stroke, style = Stroke(width = 1f))
        }
    }
}

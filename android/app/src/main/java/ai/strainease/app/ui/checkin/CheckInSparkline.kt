package ai.strainease.app.ui.checkin

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.strainease.app.data.CheckInTrendPoint

/**
 * Multi-series sparkline for the daily check-in trend. Four
 * colored polylines (mood / sleep / pain / anxiety) over a
 * 14-day window, drawn with Compose's [Canvas] (no chart
 * library). Mirrors the iOS `CheckInSparkline.swift` and the
 * web `Sparkline.tsx` so the iOS, Android, and web clients
 * all show the same shape.
 *
 * Gaps in the data are drawn as a thin dotted vertical line
 * so the patient can tell at a glance "I missed a day"
 * without thinking the trend dipped to zero.
 */
@Composable
fun CheckInSparkline(
    points: List<CheckInTrendPoint>,
    modifier: Modifier = Modifier,
) {
    val gridColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.6f)
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .padding(horizontal = 4.dp),
        ) {
            if (points.isEmpty()) return@Canvas
            val w = size.width
            val h = size.height
            val stepX = if (points.size > 1) w / (points.size - 1) else 0f
            // Horizontal grid lines at 1, 3, 5.
            for (value in intArrayOf(1, 3, 5)) {
                val y = h * (1f - (value - 1) / 4f)
                drawLine(
                    color = gridColor,
                    start = Offset(0f, y),
                    end = Offset(w, y),
                    strokeWidth = 0.5f,
                )
            }

            data class Series(val color: Color, val values: List<Int?>)
            val series = listOf(
                Series(Color(0xFF22C55E), points.map { it.mood }),
                Series(Color(0xFF14B8A6), points.map { it.sleep }),
                Series(Color(0xFFEF4444), points.map { it.pain }),
                Series(Color(0xFFF59E0B), points.map { it.anxiety }),
            )
            series.forEach { s ->
                val path = Path()
                var started = false
                points.indices.forEach { i ->
                    val v = s.values[i] ?: return@forEach
                    val x = i * stepX
                    val y = h * (1f - (v - 1) / 4f)
                    if (!started) {
                        path.moveTo(x, y)
                        started = true
                    } else {
                        path.lineTo(x, y)
                    }
                }
                drawPath(
                    path = path,
                    color = s.color,
                    style = Stroke(width = 3.2f, pathEffect = null),
                )
                // Gap markers — a thin dotted vertical line at
                // any day where the metric was missing.
                val gapEffect = PathEffect.dashPathEffect(floatArrayOf(4f, 4f), 0f)
                points.indices.forEach { i ->
                    if (s.values[i] == null) {
                        val x = i * stepX
                        drawLine(
                            color = s.color.copy(alpha = 0.25f),
                            start = Offset(x, 0f),
                            end = Offset(x, h),
                            strokeWidth = 1.5f,
                            pathEffect = gapEffect,
                        )
                    }
                }
            }
        }

        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(start = 4.dp),
        ) {
            LegendDot(label = "Mood", color = Color(0xFF22C55E))
            LegendDot(label = "Sleep", color = Color(0xFF14B8A6))
            LegendDot(label = "Pain", color = Color(0xFFEF4444))
            LegendDot(label = "Anxiety", color = Color(0xFFF59E0B))
        }
    }
}

@Composable
private fun LegendDot(label: String, color: Color) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        androidx.compose.foundation.layout.Box(
            modifier = Modifier
                .size(6.dp)
                .clip(CircleShape)
                .background(color),
        )
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontSize = 10.sp,
        )
    }
}

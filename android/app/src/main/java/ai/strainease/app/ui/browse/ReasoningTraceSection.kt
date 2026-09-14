package ai.strainease.app.ui.find

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.strainease.app.models.ReasoningEvidence
import ai.strainease.app.models.ReasoningEvidenceItem
import ai.strainease.app.models.ReasoningSource

/**
 * "Why this strain" — auditable evidence ledger for a single
 * AI recommendation. Direct port of the iOS
 * `ReasoningTraceView` and the web `ReasoningTrace.tsx`.
 *
 * Renders the `reasoning` block the model emits with every
 * pick from `recommendStrainsForConditions`. The patient can
 * collapse the rest of the card and still see this; if a
 * number or claim later feels off, they can audit exactly
 * which input it came from without re-running a search.
 *
 * The component renders nothing when `reasoning` is null so
 * it is safe to mount on every card without DOM noise for
 * older model responses.
 */
@Composable
fun ReasoningTraceSection(
    reasoning: ReasoningEvidence?,
    modifier: Modifier = Modifier,
) {
    if (reasoning == null || reasoning.isEmpty) return
    var isOpen by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.5f))
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp)),
        verticalArrangement = Arrangement.spacedBy(0.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .clickable { isOpen = !isOpen }
                .padding(horizontal = 12.dp, vertical = 10.dp),
        ) {
            Icon(
                imageVector = Icons.Filled.AutoAwesome,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(14.dp),
            )
            Text(
                "Why this strain",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 8.dp),
            )
            Box(modifier = Modifier.weight(1f))
            Text(
                "${reasoning.evidence.size} ${if (reasoning.evidence.size == 1) "source" else "sources"}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 11.sp,
            )
            Icon(
                imageVector = Icons.Filled.ExpandMore,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier
                    .size(14.dp)
                    .padding(start = 4.dp)
                    .rotate(if (isOpen) 180f else 0f),
            )
        }
        AnimatedVisibility(visible = isOpen) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp)
                    .padding(bottom = 12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (reasoning.matchedConditions.isNotEmpty()) {
                    SectionBlock(
                        title = "Matched your conditions",
                    ) {
                        BulletList(items = reasoning.matchedConditions)
                    }
                }
                if (reasoning.preferencesApplied.isNotEmpty()) {
                    SectionBlock(
                        title = "Honored your preferences",
                    ) {
                        BulletList(items = reasoning.preferencesApplied)
                    }
                }
                if (reasoning.evidence.isNotEmpty()) {
                    SectionBlock(
                        title = "Source-anchored evidence",
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            reasoning.evidence.forEach { item ->
                                EvidenceRow(item)
                            }
                        }
                    }
                }
                if (reasoning.considerations.isNotEmpty()) {
                    SectionBlock(
                        title = "Weigh before trying",
                        titleColor = Color(0xFFF59E0B),
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            reasoning.considerations.forEach { c ->
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Icon(
                                        imageVector = Icons.Filled.WarningAmber,
                                        contentDescription = null,
                                        tint = Color(0xFFF59E0B),
                                        modifier = Modifier
                                            .size(11.dp)
                                            .padding(top = 2.dp),
                                    )
                                    Text(
                                        c,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color(0xFFF59E0B),
                                    )
                                }
                            }
                        }
                    }
                }
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.Top,
                ) {
                    Icon(
                        imageVector = Icons.Filled.History,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier
                            .size(11.dp)
                            .padding(top = 2.dp),
                    )
                    Text(
                        "Evidence was drawn from the same inputs the model was given (Leafly/Weedmaps/Allbud profiles, community notes, the curated Reddit seed, and your own relief log). No facts are invented.",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 10.sp,
                    )
                    if (reasoning.evidence.isNotEmpty()) {
                        Icon(
                            imageVector = Icons.Filled.CheckCircle,
                            contentDescription = null,
                            tint = Color(0xFF22C55E),
                            modifier = Modifier.size(11.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionBlock(
    title: String,
    titleColor: Color = MaterialTheme.colorScheme.onSurfaceVariant,
    content: @Composable () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            title.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            color = titleColor,
            fontSize = 10.sp,
        )
        content()
    }
}

@Composable
private fun BulletList(items: List<String>) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        items.forEach { item ->
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    "•",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                )
                Text(
                    item,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
    }
}

@Composable
private fun EvidenceRow(item: ReasoningEvidenceItem) {
    val (dotColor, pillBg, pillFg) = sourceTone(item.source)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Box(
            modifier = Modifier
                .padding(top = 6.dp)
                .size(6.dp)
                .clip(CircleShape)
                .background(dotColor),
        )
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(pillBg)
                    .padding(horizontal = 8.dp, vertical = 3.dp),
            ) {
                Text(
                    item.source.name,
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = pillFg,
                    fontSize = 9.sp,
                )
            }
            Text(
                item.quote,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

private data class SourceTone(val dot: Color, val pillBg: Color, val pillFg: Color)

private fun sourceTone(source: ReasoningSource): SourceTone = when (source) {
    ReasoningSource.Leafly -> SourceTone(
        Color(0xFF22C55E),
        Color(0xFF22C55E).copy(alpha = 0.12f),
        Color(0xFF22C55E),
    )
    ReasoningSource.Weedmaps -> SourceTone(
        Color(0xFF3B82F6),
        Color(0xFF3B82F6).copy(alpha = 0.12f),
        Color(0xFF3B82F6),
    )
    ReasoningSource.Allbud -> SourceTone(
        Color(0xFFA855F7),
        Color(0xFFA855F7).copy(alpha = 0.12f),
        Color(0xFFA855F7),
    )
    ReasoningSource.Reddit -> SourceTone(
        Color(0xFFF97316),
        Color(0xFFF97316).copy(alpha = 0.12f),
        Color(0xFFF97316),
    )
    ReasoningSource.Aggregated -> SourceTone(
        Color(0xFF6B7280),
        Color(0xFF6B7280).copy(alpha = 0.12f),
        Color(0xFF6B7280),
    )
    ReasoningSource.PatientHistory -> SourceTone(
        Color(0xFF22C55E), // primary is dynamic — fall back to green for the Android visual
        Color(0xFF22C55E).copy(alpha = 0.12f),
        Color(0xFF22C55E),
    )
}

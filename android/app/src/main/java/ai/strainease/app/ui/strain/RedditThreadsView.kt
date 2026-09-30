package ai.strainease.app.ui.strain

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ai.strainease.app.models.RedditSource
import ai.strainease.app.ui.components.SWCard
import ai.strainease.app.ui.components.SectionLabel
import androidx.compose.foundation.shape.CircleShape

/**
 * Vetted Reddit threads block for the strain detail page. 1:1 port
 * of the iOS `RedditThreadsView` (Strain/RedditThreadsView.swift)
 * and the web `RedditThreads` component — outbound links only,
 * never live-scraped. Tapping a thread fires an ACTION_VIEW intent
 * with the thread URL so the system browser or Reddit app picks it
 * up.
 *
 * Pass any number of sources; the section renders nothing for an
 * empty list (the strain detail omits the entire block in that
 * case). Caller is responsible for fetching the threads via
 * [ai.strainease.app.data.StrainAPI.redditThreads].
 */
@Composable
fun RedditThreadsView(
    sources: List<RedditSource>,
    modifier: Modifier = Modifier,
    title: String = "Reddit threads for this strain",
    description: String = "Public threads mentioning this strain — pulled from a curated list, not live-scraped.",
) {
    if (sources.isEmpty()) return
    val context = LocalContext.current

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        SectionLabel(title)
        Text(
            text = description,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            sources.forEach { source ->
                SWCard(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(androidx.compose.foundation.shape.RoundedCornerShape(14.dp))
                        .clickable {
                            runCatching {
                                context.startActivity(
                                    Intent(Intent.ACTION_VIEW, Uri.parse(source.url)),
                                )
                            }
                        },
                ) {
                    Row(
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .padding(2.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Forum,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp),
                            )
                        }
                        Column(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            Text(
                                text = source.title,
                                style = MaterialTheme.typography.bodyLarge.copy(
                                    fontWeight = FontWeight.SemiBold,
                                ),
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                            Text(
                                text = source.caption,
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.SemiBold,
                                ),
                                color = MaterialTheme.colorScheme.primary,
                            )
                            source.snippet?.takeIf { it.isNotBlank() }?.let { snippet ->
                                Text(
                                    text = snippet,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

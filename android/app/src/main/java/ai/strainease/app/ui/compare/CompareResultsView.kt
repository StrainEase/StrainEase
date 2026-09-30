package ai.strainease.app.ui.compare

import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowOutward
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.strainease.app.models.ConditionPick
import ai.strainease.app.models.RedditSource
import ai.strainease.app.models.StrainAnalysis
import ai.strainease.app.models.StrainComparison
import ai.strainease.app.models.StrainProfile
import ai.strainease.app.ui.components.SWCard
import ai.strainease.app.ui.components.SectionLabel
import ai.strainease.app.ui.components.TypeBadge
import ai.strainease.app.ui.theme.StrainEaseTypography

/**
 * "Here's how they compare" panel shown below the Find
 * form. 1:1 port of the iOS `CompareResultsView`. Renders
 * the AI-written headline, summary, the condition pick
 * (best strain for the patient's conditions), the
 * key differences / common ground / cautions lists, and
 * any Reddit threads the model cited.
 */
@Composable
fun CompareResultsView(
    comparison: StrainComparison,
    onOpenProfile: (StrainProfile) -> Unit,
    modifier: Modifier = Modifier,
) {
    val analysis = comparison.analysis
    val context = LocalContext.current

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text(
            text = analysis.headline,
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onBackground,
        )
        if (analysis.summary.isNotEmpty()) {
            Text(
                text = analysis.summary,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        analysis.forCondition?.let { pick ->
            conditionCard(pick, onOpenProfile)
        }
        analysis.keyDifferences.takeIf { it.isNotEmpty() }?.let { list ->
            bulletCard("Key differences", list)
        }
        analysis.commonGround.takeIf { it.isNotEmpty() }?.let { list ->
            bulletCard("Common ground", list)
        }
        analysis.cautions.takeIf { it.isNotEmpty() }?.let { list ->
            bulletCard("Cautions", list)
        }
        analysis.redditSources?.takeIf { it.isNotEmpty() }?.let { sources ->
            redditCard(sources) { url ->
                runCatching {
                    context.startActivity(
                        android.content.Intent(
                            android.content.Intent.ACTION_VIEW,
                            Uri.parse(url),
                        ),
                    )
                }
            }
        }
        // The strains themselves — render each as a card with
        // the type badge, subtitle, and an "open detail" affordance
        // so the user can quickly see what's being compared
        // without re-reading raw JSON. Mirrors the iOS row card.
        comparison.strains.takeIf { it.isNotEmpty() }?.let { strains ->
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                SectionLabel(title = "Strains", index = 99)
                strains.forEach { profile ->
                    SWCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onOpenProfile(profile) },
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            Column(
                                modifier = Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    Text(
                                        text = profile.name,
                                        style = StrainEaseTypography.titleMedium,
                                        color = MaterialTheme.colorScheme.onSurface,
                                    )
                                    if (profile.type != null) {
                                        TypeBadge(type = profile.type)
                                    }
                                }
                                if (profile.subtitle.isNotEmpty()) {
                                    Text(
                                        text = profile.subtitle,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                            Icon(
                                imageVector = Icons.Filled.ArrowOutward,
                                contentDescription = "Open ${profile.name}",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun conditionCard(pick: ConditionPick, onOpenProfile: (StrainProfile) -> Unit) {
    SWCard(emphasized = true) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                text = "Best for your conditions",
                style = StrainEaseTypography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = pick.best,
                style = StrainEaseTypography.titleLarge.copy(fontSize = 20.sp),
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = pick.why,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (pick.runnerUp.isNotEmpty()) {
                Text(
                    text = "Runner-up: ${pick.runnerUp}",
                    style = StrainEaseTypography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun bulletCard(title: String, items: List<String>) {
    SWCard {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            SectionLabel(title = title)
            items.forEach { item ->
                Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "•",
                        style = StrainEaseTypography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary,
                    )
                    Text(
                        text = item,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }
            }
        }
    }
}

@Composable
private fun redditCard(sources: List<RedditSource>, onOpen: (String) -> Unit) {
    SWCard {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            SectionLabel(title = "Patient threads")
            sources.forEach { source ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onOpen(source.url) }
                        .padding(vertical = 6.dp),
                    verticalAlignment = Alignment.Top,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(
                        imageVector = Icons.Filled.Forum,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = source.title,
                            style = StrainEaseTypography.titleSmall,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        if (!source.snippet.isNullOrEmpty()) {
                            Text(
                                text = source.snippet,
                                style = StrainEaseTypography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Text(
                            text = source.caption,
                            style = StrainEaseTypography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

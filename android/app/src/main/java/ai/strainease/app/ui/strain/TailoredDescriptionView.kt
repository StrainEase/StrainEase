package ai.strainease.app.ui.strain

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.strainease.app.data.StrainAPI
import ai.strainease.app.models.StrainDescription
import ai.strainease.app.models.StrainDescriptionSection
import ai.strainease.app.models.StrainProfile
import ai.strainease.app.ui.components.SWCard
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val TAILORED_LOADING_MESSAGES = listOf(
    "Loading strain data…",
    "Cross referencing your symptoms…",
    "Analyzing medications…",
    "Looking at past strain experiences…",
    "Almost done…",
)

/**
 * Tailored description section for a strain detail page. 1:1 port of
 * the iOS `TailoredDescriptionSection`. Fetches a three-section AI
 * description on first load and re-fetches when ailments change.
 *
 * Each section renders:
 *  - Heading (uppercase eyebrow + bold title)
 *  - Body text (paragraphs split on blank lines)
 *  - "Ask Maya" button that calls `elaborateSection` and shows
 *    Maya's deeper take inline
 *
 * While the tailored description is being fetched, a rotating loading
 * state is shown with messages that match the web cadence (1.6s/msg).
 */
@Composable
fun TailoredDescriptionView(
    profile: StrainProfile,
    api: StrainAPI,
    ailments: List<String>,
    medications: List<String>,
    reliefHistory: String,
    modifier: Modifier = Modifier,
) {
    var tailoredDescription by remember { mutableStateOf<StrainDescription?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var loadingMessageIndex by remember { mutableIntStateOf(0) }
    var hasLoadedOnce by remember { mutableStateOf(false) }

    // Local helper — must be before all its call sites.
    suspend fun fetchTailoredDescription() {
        isLoading = true
        try {
            tailoredDescription = api.describe(
                strain = profile,
                ailments = ailments,
                medications = medications,
                reliefHistory = reliefHistory,
                language = "English",
            )
        } catch (_: Throwable) {
            // Keep the static `profile.description` on failure.
            tailoredDescription = null
        } finally {
            isLoading = false
        }
    }

    // Rotate the loading message every 1.6 seconds, matching the web
    // ROTATE_INTERVAL_MS so all three surfaces stay in step.
    LaunchedEffect(isLoading) {
        if (!isLoading) return@LaunchedEffect
        loadingMessageIndex = 0
        while (isLoading) {
            delay(1_600L)
            loadingMessageIndex = (loadingMessageIndex + 1) % TAILORED_LOADING_MESSAGES.size
        }
    }

    // Fetch tailored description on first load.
    LaunchedEffect(profile.slug, hasLoadedOnce) {
        if (hasLoadedOnce) return@LaunchedEffect
        hasLoadedOnce = true
        fetchTailoredDescription()
    }

    // Re-fetch when ailments change (user edits saved ailments while
    // the detail page is open).
    LaunchedEffect(ailments) {
        if (!hasLoadedOnce) return@LaunchedEffect
        fetchTailoredDescription()
    }

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        when {
            tailoredDescription != null -> {
                TailoredDescriptionContent(
                    description = tailoredDescription!!,
                    profile = profile,
                    ailments = ailments,
                    medications = medications,
                    reliefHistory = reliefHistory,
                    api = api,
                )
            }
            isLoading -> {
                TailoredDescriptionLoading(message = TAILORED_LOADING_MESSAGES[loadingMessageIndex])
            }
            // No tailored description and not loading — fall back to
            // static profile.description (handled in the caller).
        }
    }
}

@Composable
private fun TailoredDescriptionContent(
    description: StrainDescription,
    profile: StrainProfile,
    ailments: List<String>,
    medications: List<String>,
    reliefHistory: String,
    api: StrainAPI,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Icon(
            imageVector = Icons.Filled.Star,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(11.dp),
        )
        Text(
            text = "Tailored to your symptoms",
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 1.0.sp,
            ),
            color = MaterialTheme.colorScheme.primary,
        )
    }
    description.sections.forEach { section ->
        TailoredDescriptionSectionCard(
            section = section,
            profile = profile,
            ailments = ailments,
            medications = medications,
            reliefHistory = reliefHistory,
            api = api,
        )
    }
}

@Composable
private fun TailoredDescriptionSectionCard(
    section: StrainDescriptionSection,
    profile: StrainProfile,
    ailments: List<String>,
    medications: List<String>,
    reliefHistory: String,
    api: StrainAPI,
) {
    var isOpen by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var elaboration by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    SWCard {
        Column(
            modifier = Modifier.animateContentSize(),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top,
            ) {
                Text(
                    text = section.heading,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.SemiBold,
                    ),
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f),
                )
                Spacer(Modifier.size(8.dp))
                AskMayaButton(
                    isLoading = isLoading,
                    isOpen = isOpen,
                    onClick = {
                        if (isOpen) {
                            isOpen = false
                            return@AskMayaButton
                        }
                        scope.launch {
                            isLoading = true
                            errorMessage = null
                            try {
                                elaboration = api.elaborate(
                                    strain = profile,
                                    sectionHeading = section.heading,
                                    sectionBody = section.body,
                                    ailments = ailments,
                                    medications = medications,
                                    reliefHistory = reliefHistory,
                                    language = "English",
                                )
                                isOpen = true
                            } catch (t: Throwable) {
                                errorMessage = t.localizedMessage ?: "Couldn't get more detail."
                            } finally {
                                isLoading = false
                            }
                        }
                    },
                )
            }

            // Body paragraphs — split on blank lines, mirroring iOS.
            val paragraphs = section.body
                .split("\n\n")
                .map { it.trim() }
                .filter { it.isNotEmpty() }
            if (paragraphs.isEmpty()) {
                Text(
                    text = section.body,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    paragraphs.forEach { para ->
                        Text(
                            text = para,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                    }
                }
            }

            // Maya's take — shown after elaborate call.
            if (isOpen) {
                ElaborationBlock(
                    elaboration = elaboration,
                    errorMessage = errorMessage,
                )
            }
        }
    }
}

@Composable
private fun AskMayaButton(
    isLoading: Boolean,
    isOpen: Boolean,
    onClick: () -> Unit,
) {
    val primary = MaterialTheme.colorScheme.primary
    val accent = MaterialTheme.colorScheme.primaryContainer

    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(accent.copy(alpha = 0.85f))
            .border(0.5.dp, primary.copy(alpha = 0.35f), RoundedCornerShape(50))
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                strokeWidth = 2.dp,
                color = primary,
                modifier = Modifier.size(12.dp),
            )
        } else {
            Icon(
                imageVector = Icons.Filled.Star,
                contentDescription = null,
                tint = primary,
                modifier = Modifier.size(10.dp),
            )
        }
        Text(
            text = when {
                isLoading -> "Asking Maya…"
                isOpen -> "Hide"
                else -> "Ask Maya"
            },
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
            color = primary,
        )
    }
}

@Composable
private fun ElaborationBlock(
    elaboration: String?,
    errorMessage: String?,
) {
    val primary = MaterialTheme.colorScheme.primary
    val accent = MaterialTheme.colorScheme.primaryContainer

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(accent.copy(alpha = 0.45f))
            .padding(10.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(
                imageVector = Icons.Filled.Star,
                contentDescription = null,
                tint = primary,
                modifier = Modifier.size(10.dp),
            )
            Text(
                text = "Maya's take",
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 1.0.sp,
                ),
                color = primary,
            )
        }
        when {
            elaboration != null -> {
                Text(
                    text = elaboration,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
            errorMessage != null -> {
                Text(
                    text = errorMessage,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun TailoredDescriptionLoading(message: String) {
    SWCard {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            CircularProgressIndicator(
                strokeWidth = 2.dp,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(14.dp),
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.Star,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(11.dp),
                )
                Text(
                    text = message,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontWeight = FontWeight.Medium,
                    ),
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
    }
}

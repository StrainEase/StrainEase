package ai.strainease.app.ui.strain

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import kotlinx.coroutines.flow.collect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ai.strainease.app.data.RecentlyViewedStore
import ai.strainease.app.data.ReliefLogStore
import ai.strainease.app.data.SavedAilmentsStore
import ai.strainease.app.data.SavedMedicationsStore
import ai.strainease.app.data.SavedStrainsStore
import ai.strainease.app.data.StrainAPI
import ai.strainease.app.models.StrainProfile
import ai.strainease.app.models.Terpene
import ai.strainease.app.ui.compare.CompareSelectionStore
import ai.strainease.app.ui.compare.CompareToggleButton
import ai.strainease.app.ui.components.Eyebrow
import ai.strainease.app.ui.components.IntensityBar
import ai.strainease.app.ui.components.MeshBackground
import ai.strainease.app.ui.components.SWCard
import ai.strainease.app.ui.components.SWChip
import ai.strainease.app.ui.components.SWErrorBanner
import ai.strainease.app.ui.components.SWFlowRow
import ai.strainease.app.ui.components.SectionLabel
import ai.strainease.app.ui.components.StrainPhoto
import ai.strainease.app.ui.components.TypeBadge
import ai.strainease.app.ui.theme.StrainEaseTypography
import kotlinx.coroutines.launch

/**
 * The strain detail screen. 1:1 port of the iOS
 * `StrainDetailView`. All major sections from iOS are wired:
 *
 *  1. Header: hero photo, name, type badge, "Daytime /
 *     Anytime / Evening-leaning" badge, Leafly rating
 *  2. TailoredDescriptionView: AI three-section description
 *     (falls back to static `profile.description`)
 *  3. "Commonly used for" chip rail
 *  4. "How it might feel" — effects list with intensity bars
 *  5. Terpenes — tappable profile rows
 *  6. Shop links (Leafly + Weedmaps)
 *  7. "Watch for" — side-effects chip rail
 *  8. Patient tried-notes list (relief log for this strain)
 *  9. "How did it work for you?" form (ReliefLogForm)
 * 10. CommunityVoicesSection: Leafly rating card, Reddit /
 *     weed-site tabbed reviews
 * 11. SharedNotesView: Firestore community notes
 */
@Composable
fun StrainDetailView(
    profile: StrainProfile,
    api: StrainAPI,
    recentlyViewed: RecentlyViewedStore,
    relief: ReliefLogStore,
    savedAilments: SavedAilmentsStore,
    savedMedications: SavedMedicationsStore,
    savedStrains: SavedStrainsStore,
    compareStore: CompareSelectionStore,
    modifier: Modifier = Modifier,
) {
    var current by remember(profile.slug) { mutableStateOf(profile) }
    var isHydrating by remember(profile.slug) { mutableStateOf(profile.pendingHydrationSections.isNotEmpty()) }
    var expandedTerpene by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    // Collect saved ailments and medications as state so TailoredDescriptionView
    // can re-fetch when they change (user edits saved ailments while on detail).
    var ailments by remember { mutableStateOf(emptyList<String>()) }
    var medications by remember { mutableStateOf(emptyList<String>()) }
    LaunchedEffect(Unit) {
        savedAilments.ailmentsFlow.collect { ailments = it }
    }
    LaunchedEffect(Unit) {
        savedMedications.namesFlow.collect { medications = it }
    }

    LaunchedEffect(profile.slug) {
        // 1. Record in recents so the Home rail picks it up
        recentlyViewed.record(profile)
        // 2. Populate relief summary cache so `relief.summary` is non-empty
        //    for the tailored description AI call.
        relief.refresh()
        // 3. Hydrate any missing sections
        val pending = current.pendingHydrationSections
        if (pending.isNotEmpty()) {
            try {
                val fresh = api.search(name = profile.name)
                if (fresh != null) {
                    current = current.copyHydratedFrom(fresh, pending)
                }
            } catch (t: Throwable) {
                error = t.localizedMessage
            }
        }
        isHydrating = false
    }

    val triedNotes = relief.forStrain(profile.name)

    Box(modifier = modifier.fillMaxSize()) {
        MeshBackground()
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            header(
                profile = current,
                isHydrating = isHydrating,
                compareStore = compareStore,
                savedStrains = savedStrains,
                onToggleSave = {
                    scope.launch { savedStrains.toggle(profile) }
                },
            )
            descriptionBlock(
                profile = current,
                api = api,
                ailments = ailments,
                medications = medications,
                reliefHistory = relief.summary,
            )
            if (!current.medicalUses.isNullOrEmpty()) {
                chipSection(
                    title = "Commonly used for",
                    index = 1,
                    items = current.medicalUses!!,
                )
            }
            effectsSection(effects = current.effects ?: emptyList())
            if (!current.terpenes.isNullOrEmpty()) {
                terpenesSection(
                    terpenes = current.terpenes!!,
                    expandedName = expandedTerpene,
                    onToggle = { name ->
                        expandedTerpene = if (expandedTerpene == name) null else name
                    },
                )
            }
            ShopLinksView(profile = current)
            if (!current.sideEffects.isNullOrEmpty()) {
                chipSection(
                    title = "Watch for",
                    index = 2,
                    items = current.sideEffects!!,
                )
            }
            triedNotesSection(triedNotes)
            ReliefLogForm(
                strainName = profile.name,
                strainSlug = profile.slug,
                relief = relief,
            )
            CommunityVoicesSection(
                rating = current.resolvedLeaflyRating,
                quotes = current.quoteNotes,
                isHydrating = isHydrating,
            )
            SharedNotesView(strainSlug = profile.slug)
            error?.let { SWErrorBanner(message = it) }
        }
    }
}

@Composable
private fun header(profile: StrainProfile, isHydrating: Boolean, compareStore: CompareSelectionStore, savedStrains: SavedStrainsStore, onToggleSave: () -> Unit) {
    val score = StrainMeaning.dayNightScore(profile)
    val dayNightLabel = StrainMeaning.labelFor(score)
    val compareNames by compareStore.names.collectAsState()
    val saved by savedStrains.savedFlow.collectAsState(initial = emptyList())
    val isLiked = saved.any { it.slug == profile.slug }
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        // Photo with two floating toolbar buttons pinned to the
        // top-right: heart (save / unsave) and compare-toggle.
        // Mirrors the iOS `StrainDetailView` toolbar pair so the
        // user can save the strain without leaving the screen.
        Box(modifier = Modifier.fillMaxWidth()) {
            StrainPhoto(
                urlString = profile.imageUrl,
                type = profile.type,
                height = 220.dp,
                cornerRadius = 22.dp,
            )
            androidx.compose.foundation.layout.Row(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(12.dp),
                horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp),
            ) {
                // Heart — toggles the saved-strain status.
                Surface(
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.surface,
                    border = BorderStroke(
                        1.dp,
                        if (isLiked) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.outline,
                    ),
                    modifier = Modifier
                        .size(40.dp)
                        .clickable { onToggleSave() },
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = if (isLiked) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                            contentDescription = if (isLiked) "Remove from saved strains" else "Save strain",
                            tint = if (isLiked) androidx.compose.material3.MaterialTheme.colorScheme.primary
                            else androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                CompareToggleButton(
                    isInSelection = profile.name in compareNames,
                    atCap = compareStore.atCap,
                    onToggle = { compareStore.toggle(profile.name) },
                )
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TypeBadge(type = profile.type)
            Text(
                text = dayNightLabel,
                style = StrainEaseTypography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .padding(horizontal = 10.dp, vertical = 5.dp),
            )
        }
        Text(
            text = profile.name,
            style = MaterialTheme.typography.displaySmall,
            color = MaterialTheme.colorScheme.onBackground,
        )
        if (!profile.subtitle.isEmpty()) {
            Text(
                text = profile.subtitle,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        val rating = profile.resolvedLeaflyRating
        if (rating != null) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(
                    imageVector = Icons.Filled.Star,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(16.dp),
                )
                Text(
                    text = "%.1f".format(rating.first),
                    style = StrainEaseTypography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                rating.second?.let { count ->
                    Text(
                        text = " · $count reviews",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
        if (isHydrating) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                CircularProgressIndicator(
                    color = MaterialTheme.colorScheme.primary,
                    strokeWidth = 2.dp,
                    modifier = Modifier.size(14.dp),
                )
                Text(
                    text = "Loading full profile…",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun descriptionBlock(
    profile: StrainProfile,
    api: StrainAPI,
    ailments: List<String>,
    medications: List<String>,
    reliefHistory: String,
) {
    TailoredDescriptionView(
        profile = profile,
        api = api,
        ailments = ailments,
        medications = medications,
        reliefHistory = reliefHistory,
    )
    // If TailoredDescriptionView shows nothing (no AI result yet and not loading),
    // fall back to the static description so the user sees something immediately.
    if (profile.description.isNullOrEmpty()) return
    SWCard {
        Text(
            text = profile.description,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun chipSection(title: String, index: Int, items: List<String>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SectionLabel(title = title, index = index)
        SWFlowRow {
            items.forEach { item ->
                SWChip(title = item, selected = false, onClick = {})
            }
        }
    }
}

@Composable
private fun effectsSection(effects: List<ai.strainease.app.models.StrainEffect>) {
    if (effects.isEmpty()) return
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SectionLabel(title = "How it might feel", index = 3)
        SWCard {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                effects.forEach { effect ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Text(
                            text = effect.name,
                            style = StrainEaseTypography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.weight(1f),
                        )
                        IntensityBar(value = effect.intensity)
                    }
                }
            }
        }
    }
}

@Composable
private fun terpenesSection(
    terpenes: List<Terpene>,
    expandedName: String?,
    onToggle: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SectionLabel(title = "Terpenes", index = 4)
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            terpenes.forEach { terpene ->
                TerpeneProfile(
                    terpene = terpene,
                    expanded = expandedName == terpene.name,
                    onToggle = { onToggle(terpene.name) },
                )
            }
        }
    }
}

@Composable
private fun triedNotesSection(notes: List<ai.strainease.app.data.ReliefLog>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SectionLabel(title = "Your tried notes", index = 5)
        if (notes.isEmpty()) {
            Text(
                text = "Log how this strain worked for you below — only you see these notes.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            SWCard {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    notes.forEach { log ->
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                repeat(log.rating) {
                                    Icon(
                                        imageVector = Icons.Filled.Star,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(12.dp),
                                    )
                                }
                                Text(
                                    text = log.strainName,
                                    style = StrainEaseTypography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Text(
                                text = log.notes,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                        }
                    }
                }
            }
        }
    }
}

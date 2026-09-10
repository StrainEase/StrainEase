package ai.strainease.app.ui.strain

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Maximize
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import ai.strainease.app.data.RecentlyViewedStore
import ai.strainease.app.data.ReliefLogStore
import ai.strainease.app.data.SavedAilmentsStore
import ai.strainease.app.data.SavedMedicationsStore
import ai.strainease.app.data.ThcSensitivity
import ai.strainease.app.data.ThcSensitivityStore
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
import coil.compose.AsyncImage
import coil.request.ImageRequest
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
    thcSensitivity: ThcSensitivityStore,
    savedStrains: SavedStrainsStore,
    compareStore: CompareSelectionStore,
    modifier: Modifier = Modifier,
) {
    var current by remember(profile.slug) { mutableStateOf(profile) }
    var isHydrating by remember(profile.slug) { mutableStateOf(profile.pendingHydrationSections.isNotEmpty()) }
    var showPhotoZoom by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val appNav = ai.strainease.app.app.LocalAppNavigation.current
    // Popular strains power the "Strains in this family" list inside
    // each terpene detail sheet. We pre-load once when the page
    // opens so opening a sheet on first tap has data ready and the
    // user never sees a flash of "no popular strains" before the
    // list resolves.
    var familyStrains by remember { mutableStateOf(emptyList<ai.strainease.app.models.StrainProfile>()) }
    var familyLoading by remember { mutableStateOf(true) }
    LaunchedEffect(Unit) {
        try {
            familyStrains = api.popular()
        } catch (_: Throwable) {
            // Silent — the sheet falls back to its empty state.
        } finally {
            familyLoading = false
        }
    }

    // Collect saved ailments and medications as state so TailoredDescriptionView
    // can re-fetch when they change (user edits saved ailments while on detail).
    var ailments by remember { mutableStateOf(emptyList<String>()) }
    var medications by remember { mutableStateOf(emptyList<String>()) }
    var redditThreads by remember { mutableStateOf(emptyList<ai.strainease.app.models.RedditSource>()) }
    LaunchedEffect(Unit) {
        savedAilments.ailmentsFlow.collect { ailments = it }
    }
    LaunchedEffect(Unit) {
        savedMedications.namesFlow.collect { medications = it }
    }
    LaunchedEffect(profile.slug) {
        // Curated Reddit threads for this strain. Public callable
        // so it works pre-sign-in; failures are silent (the section
        // simply doesn't render).
        redditThreads = try {
            api.redditThreads(name = profile.name, conditions = ailments)
        } catch (t: Throwable) {
            emptyList()
        }
    }

    LaunchedEffect(profile.slug) {
        // 1. Record in recents so the Home rail picks it up
        recentlyViewed.record(profile)
        // 2. Populate relief summary cache so `relief.summary` is non-empty
        //    for the tailored description AI call.
        relief.refresh()
        // 2b. Make sure the THC sensitivity cache is fresh so the
        //     tailored description call sends the right value.
        thcSensitivity.refresh()
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

    // Active hydration slots — empty once the search() call has
    // settled (success or failure) so placeholders collapse on
    // their own. Mirrors the iOS StrainDetailView's `pending`
    // computed property so the same set of sections can show
    // their skeleton state on Android.
    val pending: Set<StrainHydrationSection> = if (isHydrating) current.pendingHydrationSections else emptySet()

    Box(modifier = modifier.fillMaxSize()) {
        MeshBackground()
        Column(
            modifier = Modifier
                .fillMaxSize()
                // The detail overlay lives outside the Scaffold, so it
                // must pad itself below the status bar (edge-to-edge).
                .statusBarsPadding()
                .verticalScroll(rememberScrollState())
                // 20dp horizontal gutter so the section cards stop at
                // the screen edges and match the iOS detail page.
                // Bottom margin still matches the iOS detail page (48pt).
                .padding(start = 20.dp, top = 8.dp, end = 20.dp, bottom = 48.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            header(
                profile = current,
                isHydrating = isHydrating,
                pending = pending,
                compareStore = compareStore,
                savedStrains = savedStrains,
                onToggleSave = {
                    scope.launch { savedStrains.toggle(profile) }
                },
                onPhotoClick = { showPhotoZoom = true },
            )
            descriptionBlock(
                profile = current,
                api = api,
                ailments = ailments,
                medications = medications,
                reliefHistory = relief.summary,
                thcSensitivity = thcSensitivity.sensitivity,
                pending = pending,
            )
            val uses = current.medicalUses
            if (!uses.isNullOrEmpty() || StrainHydrationSection.Uses in pending) {
                // Render the card with a null list (skeleton) when
                // the data hasn't arrived yet so the chip rail
                // doesn't pop in suddenly when search() lands.
                chipSection(
                    title = "Commonly used for",
                    items = if (StrainHydrationSection.Uses in pending && uses.isNullOrEmpty()) null else uses,
                )
            }
            val effects = current.effects
            if (!effects.isNullOrEmpty() || StrainHydrationSection.Effects in pending) {
                effectsSection(
                    effects = if (StrainHydrationSection.Effects in pending && effects.isNullOrEmpty()) null else effects,
                )
            }
            val terpenes = current.terpenes
            if (!terpenes.isNullOrEmpty() || StrainHydrationSection.Terpenes in pending) {
                terpenesSection(
                    terpenes = if (StrainHydrationSection.Terpenes in pending && terpenes.isNullOrEmpty()) null else terpenes,
                    familyStrains = familyStrains,
                    familyLoading = familyLoading,
                    onSelectStrain = { selected ->
                        appNav.requestOpenProfile(selected)
                    },
                )
            }
            ShopLinksView(profile = current)
            val sides = current.sideEffects
            if (!sides.isNullOrEmpty() || StrainHydrationSection.SideEffects in pending) {
                chipSection(
                    title = "Watch for",
                    items = if (StrainHydrationSection.SideEffects in pending && sides.isNullOrEmpty()) null else sides,
                )
            }
            triedNotesSection(triedNotes)
            ReliefLogForm(
                strainName = profile.name,
                strainSlug = profile.slug,
                relief = relief,
            )
            CommunityVoicesSection(
                ratings = current.resolvedCommunityRatings,
                quotes = current.quoteNotes,
                // CommunityVoicesSection already renders its own
                // loading card when this is true, so the section
                // doubles as the community hydration placeholder
                // (matches the iOS call site).
                isHydrating = StrainHydrationSection.Community in pending,
            )
            RedditThreadsView(sources = redditThreads)
            SharedNotesView(strainSlug = profile.slug)
            error?.let { SWErrorBanner(message = it) }
        }
    }

    // Photo zoom overlay
    if (showPhotoZoom) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.9f))
                .clickable { showPhotoZoom = false },
            contentAlignment = Alignment.Center,
        ) {
            val hasUrl = !current.imageUrl.isNullOrEmpty()
            if (hasUrl) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(current.imageUrl)
                        .crossfade(true)
                        .build(),
                    contentDescription = "Full-size ${current.name} photo",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                )
            } else {
                Text(
                    text = "No photo available",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White.copy(alpha = 0.5f),
                )
            }
            // Close button
            Surface(
                shape = CircleShape,
                color = Color.Black.copy(alpha = 0.5f),
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(16.dp)
                    .clickable { showPhotoZoom = false }
                    .size(36.dp),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Filled.Close,
                        contentDescription = "Close",
                        tint = Color.White,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun header(
    profile: StrainProfile,
    isHydrating: Boolean,
    pending: Set<StrainHydrationSection>,
    compareStore: CompareSelectionStore,
    savedStrains: SavedStrainsStore,
    onToggleSave: () -> Unit,
    onPhotoClick: () -> Unit = {},
) {
    val score = StrainMeaning.dayNightScore(profile)
    val dayNightLabel = StrainMeaning.labelFor(score)
    val compareNames by compareStore.names.collectAsState()
    val saved by savedStrains.savedFlow.collectAsState(initial = emptyList())
    val isLiked = saved.any { it.slug == profile.slug }
    // The parent Column above already provides the 20dp horizontal
    // gutter that matches the iOS detail page, so the header doesn't
    // need its own. The photo, name, type badge, rating, etc. all
    // sit inside that shared gutter.
    Column(
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
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
                modifier = Modifier.clickable { onPhotoClick() },
            )
            // Zoom icon in the bottom-right corner
            val hasPhoto = !profile.imageUrl.isNullOrEmpty()
            if (hasPhoto) {
                Surface(
                    shape = CircleShape,
                    color = Color.Black.copy(alpha = 0.5f),
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(10.dp)
                        .size(32.dp),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Filled.Maximize,
                            contentDescription = "View full-size photo",
                            tint = Color.White,
                            modifier = Modifier.size(16.dp),
                        )
                    }
                }
            }
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
        // Lineage is rendered inline next to the name. While the
        // search() call is still in flight, swap the static text
        // for a small spinner + caption so the slot doesn't
        // collapse to nothing. Mirrors the iOS header's
        // `else if pending.contains(.lineage) { HStack { ... } }`
        // branch so the two surfaces stay in step.
        val lineage = profile.lineage
        if (!lineage.isNullOrEmpty()) {
            Text(
                text = lineage,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else if (StrainHydrationSection.Lineage in pending) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier
                    .semantics(mergeDescendants = true) {
                        contentDescription = "Loading Lineage"
                    }
                    .testTag("strain.hydrating.lineage"),
            ) {
                CircularProgressIndicator(
                    color = MaterialTheme.colorScheme.primary,
                    strokeWidth = 2.dp,
                    modifier = Modifier.size(12.dp),
                )
                Text(
                    text = StrainHydrationSection.Lineage.caption,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        val rating = profile.resolvedCommunityRatings.firstOrNull { it.source == "Leafly" }
        if (rating != null) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(
                    imageVector = Icons.Filled.Star,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(16.dp),
                )
                Text(
                    text = java.util.Locale.US.let { "%.1f".format(it, rating.stars) },
                    style = StrainEaseTypography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                rating.reviewCount?.let { count ->
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
    thcSensitivity: ThcSensitivity,
    pending: Set<StrainHydrationSection>,
) {
    TailoredDescriptionView(
        profile = profile,
        api = api,
        ailments = ailments,
        medications = medications,
        reliefHistory = reliefHistory,
        thcSensitivity = thcSensitivity,
    )
    // The "Full Description" card always renders, even before
    // search() lands, so the user sees the page structure
    // immediately. Inside the card we either show the real
    // text (with a Show more / Show less toggle) or a skeleton
    // block of placeholder lines while the data is still
    // being fetched. This matches the "card loads initially"
    // pattern used by the other detail cards.
    val description = profile.description
    val isLoading = StrainHydrationSection.Description in pending
    SWCard {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            // Header inside the card, matching the tailored
            // section cards' bold heading style. Renders
            // during loading too so the card title is
            // visible from the first frame.
            Text(
                text = "Full Description",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.SemiBold,
                ),
                color = MaterialTheme.colorScheme.onSurface,
            )
            when {
                isLoading || description.isNullOrEmpty() -> {
                    PlaceholderTextLines(count = 4)
                }
                else -> {
                    var expanded by remember { mutableStateOf(false) }
                    Text(
                        text = description,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = if (expanded) Int.MAX_VALUE else 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = if (expanded) "Show less" else "Show more",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.clickable { expanded = !expanded },
                    )
                }
            }
        }
    }
}

/**
 * Chip-rail section ("Commonly used for" / "Watch for"). The
 * card always renders; inside, we either show real chips or a
 * skeleton row of pill placeholders while the data is still
 * being fetched. `items == null` means the search() call is
 * in flight; `items.isEmpty()` means the strain genuinely has
 * no entries for this slot (an edge case for partial catalog
 * coverage) and the card renders empty rather than disappearing.
 */
@Composable
private fun chipSection(title: String, items: List<String>?) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SectionLabel(title = title)
        SWCard {
            if (items == null) {
                PlaceholderChipRow()
            } else if (items.isNotEmpty()) {
                SWFlowRow {
                    items.forEach { item ->
                        SWChip(title = item, selected = false, onClick = {})
                    }
                }
            }
        }
    }
}

/**
 * "How it might feel" section. The card always renders; inside
 * we either show real effect rows (name + IntensityBar) or a
 * matching number of skeleton rows while the data is in
 * flight. `effects == null` is the loading signal.
 */
@Composable
private fun effectsSection(effects: List<ai.strainease.app.models.StrainEffect>?) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SectionLabel(title = "How it might feel")
        SWCard {
            if (effects == null) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    repeat(4) { PlaceholderEffectRow() }
                }
            } else if (effects.isNotEmpty()) {
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
}

/**
 * "Terpenes" section. The section label + outer column always
 * render; inside we either show real [TerpeneProfile] rows or
 * a matching number of skeleton card rows while the data is
 * in flight. `terpenes == null` is the loading signal. Real
 * terpene rows are passed through with the same family-strain
 * cache + handler the previous version used.
 */
@Composable
private fun terpenesSection(
    terpenes: List<Terpene>?,
    familyStrains: List<ai.strainease.app.models.StrainProfile>,
    familyLoading: Boolean,
    onSelectStrain: (ai.strainease.app.models.StrainProfile) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SectionLabel(title = "Terpenes")
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (terpenes == null) {
                repeat(3) { PlaceholderTerpeneRow() }
            } else if (terpenes.isNotEmpty()) {
                terpenes.forEach { terpene ->
                    TerpeneProfile(
                        terpene = terpene,
                        familyStrains = familyStrains,
                        familyLoading = familyLoading,
                        onSelectStrain = onSelectStrain,
                    )
                }
            }
        }
    }
}

@Composable
private fun triedNotesSection(notes: List<ai.strainease.app.data.ReliefLog>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SectionLabel(title = "Your tried notes")
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
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                repeat(log.rating) {
                                    Icon(
                                        imageVector = Icons.Filled.Star,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(12.dp),
                                    )
                                }
                                IntensityBar(value = log.intensity)
                                Text(
                                    text = log.strainName,
                                    style = StrainEaseTypography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.weight(1f, fill = false),
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

// ---------------------------------------------------------------------------
// Card-internal placeholders
// ---------------------------------------------------------------------------
//
// The strain detail page now renders every card from the start
// (so the user sees the page structure immediately, not blank
// gaps that "pop in" as the search() call lands). Each card
// swaps its content for one of these skeletons while the
// underlying data is still missing, and back to real content
// when the fresh profile arrives. This is the "card loads
// initially" UX the user asked for — the cards themselves are
// always present, only the contents animate in.

/**
 * Skeleton pill matching [SWChip] dimensions. Rounded at 50%
 * so it reads as a chip, not a rectangle. The caller picks a
 * width so successive chips don't all line up at the same
 * length and the row looks natural.
 */
@Composable
private fun PlaceholderChip(widthDp: Int) {
    Box(
        modifier = Modifier
            .width(widthDp.dp)
            .height(34.dp)
            .clip(RoundedCornerShape(50))
            .background(MaterialTheme.colorScheme.surfaceVariant),
    )
}

/**
 * Row of skeleton pills used inside the "Commonly used for"
 * and "Watch for" cards while the chip list is being
 * hydrated. The widths are fixed and slightly varied so the
 * row looks like real chips rather than a uniform stripe.
 */
@Composable
private fun PlaceholderChipRow() {
    val widths = listOf(74, 96, 82, 108, 68, 92)
    SWFlowRow {
        widths.forEach { w -> PlaceholderChip(widthDp = w) }
    }
}

/**
 * Skeleton row matching the real "How it might feel" effect
 * row — name bar on the left, intensity bar on the right (5
 * segments). Both bars use the muted surfaceVariant fill so
 * they read as "loading" without competing for attention
 * with the real text.
 */
@Composable
private fun PlaceholderEffectRow() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            modifier = Modifier
                .weight(1f)
                .height(16.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
            repeat(5) {
                Box(
                    modifier = Modifier
                        .size(width = 14.dp, height = 8.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                )
            }
        }
    }
}

/**
 * Skeleton row matching the real [TerpeneProfile] card —
 * card-shaped surface with a name placeholder on the first
 * line, a "Details" placeholder on the right, and a shorter
 * profile placeholder underneath. The chrome (rounded
 * corners, border, padding) matches the real row so the
 * skeleton doesn't shift the layout when the real terpene
 * name lands.
 */
@Composable
private fun PlaceholderTerpeneRow() {
    val border = MaterialTheme.colorScheme.outline
    val card = MaterialTheme.colorScheme.surface
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(card)
            .border(1.dp, border, RoundedCornerShape(14.dp))
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(16.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
            )
            Box(
                modifier = Modifier
                    .width(48.dp)
                    .height(12.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
            )
        }
        Box(
            modifier = Modifier
                .fillMaxWidth(0.72f)
                .height(12.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant),
        )
    }
}

/**
 * A block of N horizontal text-line placeholders, used inside
 * the "Full Description" card while the static
 * `profile.description` is still being fetched. The last line
 * is capped at 60% width so the block reads as "text" rather
 * than a uniform stripe — mirrors the iOS skeleton line
 * width-capping pattern.
 */
@Composable
private fun PlaceholderTextLines(count: Int) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        repeat(count) { i ->
            val isLast = i == count - 1
            Box(
                modifier = Modifier
                    .fillMaxWidth(if (isLast) 0.6f else 1f)
                    .height(14.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
            )
        }
    }
}

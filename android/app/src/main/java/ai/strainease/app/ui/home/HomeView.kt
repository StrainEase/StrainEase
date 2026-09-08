package ai.strainease.app.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.background
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.clickable
import androidx.compose.ui.draw.clip
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ai.strainease.app.data.CheckInStore
import ai.strainease.app.data.RecentStrain
import ai.strainease.app.data.RecentlyViewedStore
import ai.strainease.app.data.SavedAilmentsStore
import ai.strainease.app.models.StrainProfile
import ai.strainease.app.ui.components.Eyebrow
import ai.strainease.app.ui.components.MeshBackground
import ai.strainease.app.ui.theme.StrainEaseTypography

/**
 * The Home tab. 1:1 port of the iOS `HomeView`. Composes the
 * hero, the ailment carousel, the five type-bucketed rails,
 * the "For your symptoms" tailored rail (when the user has
 * saved ailments), and the recents rail at the bottom.
 *
 * The Compose nav stack here is intentionally tiny: PR-A9
 * (Strain Detail) will own the full strain-detail flow; this
 * view only opens a stub profile screen for now.
 */
@Composable
fun HomeView(
    model: HomeModel,
    recentlyViewed: RecentlyViewedStore,
    savedAilments: SavedAilmentsStore,
    checkIns: CheckInStore,
    modifier: Modifier = Modifier,
    onOpenProfile: (StrainProfile) -> Unit = {},
    onOpenGrid: (HomeSection, List<StrainProfile>) -> Unit = { _, _ -> },
) {
    val popular by model.popular.collectAsState()
    val ailments by model.savedAilments.collectAsState()
    val savedFlow by savedAilments.ailmentsFlow.collectAsState(initial = emptyList())
    val recentsFlow = recentlyViewed.itemsFlow.collectAsState(initial = emptyList())
    val recents: List<RecentStrain> = recentsFlow.value
    val checkInsFlow = checkIns.checkInsFlow.collectAsState(initial = checkIns.checkIns)
    val hasTodayCheckIn = checkInsFlow.value.any { it.date == CheckInStore.todayKey() }
    var showCheckInSheet by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        model.load()
        recentlyViewed.refresh()
        savedAilments.refresh()
    }
    // Keep HomeModel's savedAilments in sync with the
    // SavedAilmentsStore so the "For you" rail and ailment
    // carousel pick up new entries the user adds via
    // AccountView. Mirrors iOS HomeView's
    // `onChange(of: ailmentsStore.ailments) { ... }`.
    LaunchedEffect(savedFlow) {
        model.updateSavedAilments(savedFlow)
    }

    Box(modifier = modifier.fillMaxSize()) {
        MeshBackground()
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(28.dp),
        ) {
            hero()
            if (!hasTodayCheckIn) {
                DailyCheckInCard(onClick = { showCheckInSheet = true })
            }
            if (model.hasSavedAilments && model.strains(HomeSection.ForYou).isNotEmpty()) {
                StrainRail(
                    title = HomeSection.ForYou.title,
                    index = 1,
                    strains = model.preview(HomeSection.ForYou),
                    onSeeMore = { onOpenGrid(HomeSection.ForYou, model.strains(HomeSection.ForYou)) },
                    onSelect = onOpenProfile,
                )
            }
            StrainRail(
                title = HomeSection.Popular.title,
                index = if (model.hasSavedAilments) 2 else 1,
                strains = model.preview(HomeSection.Popular),
                onSeeMore = { onOpenGrid(HomeSection.Popular, model.strains(HomeSection.Popular)) },
                onSelect = onOpenProfile,
            )
            AilmentCarousel(
                ailments = model.ailmentsForCarousel,
                preview = { name -> model.preview(HomeSection.Ailment(name)) },
                onSeeMore = { name -> onOpenGrid(HomeSection.Ailment(name), model.strains(HomeSection.Ailment(name))) },
                onSelect = onOpenProfile,
            )
            StrainRail(
                title = HomeSection.Sativa.title,
                strains = model.preview(HomeSection.Sativa),
                onSeeMore = { onOpenGrid(HomeSection.Sativa, model.strains(HomeSection.Sativa)) },
                onSelect = onOpenProfile,
            )
            StrainRail(
                title = HomeSection.Hybrid.title,
                strains = model.preview(HomeSection.Hybrid),
                onSeeMore = { onOpenGrid(HomeSection.Hybrid, model.strains(HomeSection.Hybrid)) },
                onSelect = onOpenProfile,
            )
            StrainRail(
                title = HomeSection.Indica.title,
                strains = model.preview(HomeSection.Indica),
                onSeeMore = { onOpenGrid(HomeSection.Indica, model.strains(HomeSection.Indica)) },
                onSelect = onOpenProfile,
            )
            StrainRail(
                title = HomeSection.Recents.title,
                strains = recents.map { it.toProfile() }.take(model.previewLimit),
                emptyText = "Open a strain and it'll land here.",
                onSeeMore = { onOpenGrid(HomeSection.Recents, recents.map { it.toProfile() }) },
                onSelect = onOpenProfile,
            )
        }
    }
    if (showCheckInSheet) {
        ModalBottomSheet(onDismissRequest = { showCheckInSheet = false }) {
            ai.strainease.app.ui.checkin.CheckInPanel(
                store = checkIns,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
            )
            Box(modifier = Modifier.padding(bottom = 24.dp))
        }
    }
}

@Composable
private fun DailyCheckInCard(onClick: () -> Unit) {
    ai.strainease.app.ui.components.SWCard(
        modifier = Modifier.clickable(onClick = onClick),
    ) {
        androidx.compose.foundation.layout.Row(
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(androidx.compose.foundation.shape.CircleShape)
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)),
                contentAlignment = androidx.compose.ui.Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.FavoriteBorder,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(18.dp),
                )
            }
            androidx.compose.foundation.layout.Spacer(modifier = Modifier.size(12.dp))
            Column(
                verticalArrangement = Arrangement.spacedBy(2.dp),
                modifier = Modifier.weight(1f),
            ) {
                Text(
                    text = "How are you today?",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold,
                )
                Text(
                    text = "Track mood, sleep, pain, and anxiety. Dr. Kaya reads the trend.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun hero() {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Eyebrow(text = "Browse")
        Text(
            text = HomeHeadline.text(),
            style = StrainEaseTypography.displaySmall,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Text(
            text = HomeHeadline.SUBTITLE,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

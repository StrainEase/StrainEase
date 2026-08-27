package ai.strainease.app.app

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ai.strainease.app.R
import ai.strainease.app.models.StrainProfile

/** CompositionLocal for the app-wide [AppNavigation], mirroring
 *  the iOS `@Environment(AppNavigation.self)` pattern. */
val LocalAppNavigation = compositionLocalOf<AppNavigation> {
    error("AppNavigation not provided. Wrap content in MainTabView.")
}

/**
 * The four-tab shell. Direct port of the iOS `MainTabView.swift`:
 *  - Home / Find / Browse / Doctors
 *  - Primary tint
 *  - CompareTrayBar slot (PR-A10 will fill this)
 *  - Account / Saved sheets on top
 *  - StrainDetail overlay (the iOS app pushes a `StrainDetailView`
 *    onto each tab's `NavigationStack`; Compose doesn't share one
 *    across tabs, so we host a single full-screen detail overlay
 *    here that any tab can request via [onOpenProfile])
 */
@Composable
fun MainTabView() {
    val nav = remember { AppNavigation() }
    var selected by remember { mutableStateOf(AppTab.Home) }
    var openProfile by remember { mutableStateOf<StrainProfile?>(null) }
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext
        as ai.strainease.app.StrainEaseApplication
    val homeModel = remember { ai.strainease.app.ui.home.HomeModel() }
    val recents = remember { ai.strainease.app.data.RecentlyViewedStore(app) }
    val findModel = remember { ai.strainease.app.ui.find.FindModel() }
    val directoryModel = remember { ai.strainease.app.ui.browse.DirectoryModel() }
    val compareStore = remember { ai.strainease.app.ui.compare.CompareSelectionStore() }
    val doctorsModel = remember { ai.strainease.app.ui.doctors.DoctorsModel() }
    val savedAilments = remember { ai.strainease.app.data.SavedAilmentsStore(app) }
    val savedMedications = remember { ai.strainease.app.data.SavedMedicationsStore(app) }
    val relief = remember { ai.strainease.app.data.ReliefLogStore(app) }

    val openStrain: (StrainProfile) -> Unit = { openProfile = it }
    val closeStrain: () -> Unit = { openProfile = null }
    // Hardware / gesture back closes the detail overlay first so
    // it can never strand the user behind the bottom bar.
    BackHandler(enabled = openProfile != null) { closeStrain() }

    CompositionLocalProvider(LocalAppNavigation provides nav) {
        Box(modifier = Modifier.fillMaxSize()) {
            Scaffold(
                modifier = Modifier.fillMaxSize(),
                containerColor = MaterialTheme.colorScheme.background,
                bottomBar = {
                    Column {
                        ai.strainease.app.ui.compare.CompareTrayBar(
                            store = compareStore,
                            api = ai.strainease.app.StrainEaseApplication.strainAPI,
                            savedAilments = savedAilments,
                            savedMedications = savedMedications,
                        )
                        NavigationBar(
                            containerColor = MaterialTheme.colorScheme.surface,
                            contentColor = MaterialTheme.colorScheme.onSurface,
                        ) {
                            AppTab.entries.forEach { tab ->
                                NavigationBarItem(
                                    selected = selected == tab,
                                    onClick = { selected = tab },
                                    icon = {
                                        Icon(
                                            imageVector = tab.systemImage,
                                            contentDescription = tab.title,
                                        )
                                    },
                                    label = { Text(tab.title) },
                                    colors = NavigationBarItemDefaults.colors(
                                        selectedIconColor = MaterialTheme.colorScheme.onPrimary,
                                        selectedTextColor = MaterialTheme.colorScheme.primary,
                                        indicatorColor = MaterialTheme.colorScheme.primary,
                                        unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                        unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                    ),
                                )
                            }
                        }
                    }
                },
            ) { padding ->
                when (selected) {
                    AppTab.Home -> ai.strainease.app.ui.home.HomeView(
                        model = homeModel,
                        recentlyViewed = recents,
                        onOpenProfile = openStrain,
                        modifier = Modifier.padding(padding),
                    )
                    AppTab.Find -> ai.strainease.app.ui.find.FindView(
                        model = findModel,
                        savedAilments = savedAilments,
                        savedMedications = savedMedications,
                        relief = relief,
                        onOpenProfile = openStrain,
                        modifier = Modifier.padding(padding),
                    )
                    AppTab.Browse -> ai.strainease.app.ui.browse.DirectoryView(
                        model = directoryModel,
                        onOpenProfile = openStrain,
                        modifier = Modifier.padding(padding),
                    )
                    AppTab.Doctors -> ai.strainease.app.ui.doctors.DoctorsView(
                        model = doctorsModel,
                        modifier = Modifier.padding(padding),
                    )
                }
            }

            val profile = openProfile
            if (profile != null) {
                Box(modifier = Modifier.fillMaxSize()) {
                    ai.strainease.app.ui.strain.StrainDetailView(
                        profile = profile,
                        api = ai.strainease.app.StrainEaseApplication.strainAPI,
                        recentlyViewed = recents,
                        relief = relief,
                        savedAilments = savedAilments,
                        savedMedications = savedMedications,
                        modifier = Modifier.fillMaxSize(),
                    )
                    // Floating back chevron — mirrors the iOS navigation
                    // bar's back button so the user has a visible
                    // affordance to return to the previous tab. The
                    // system back gesture already works via the
                    // BackHandler above.
                    Surface(
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.surface,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(start = 12.dp, top = 12.dp)
                            .size(40.dp)
                            .clickable { closeStrain() },
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Filled.ArrowBack,
                                contentDescription = "Back",
                                tint = MaterialTheme.colorScheme.onSurface,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FindTabPlaceholder(modifier: Modifier) =
    ai.strainease.app.ui.components.SWCard(modifier = modifier) {
        Text(
            text = "Find (PR-A7)",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }

@Composable
private fun BrowseTabPlaceholder(modifier: Modifier) =
    ai.strainease.app.ui.components.SWCard(modifier = modifier) {
        Text(
            text = "Browse (PR-A8)",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }

@Composable
private fun DoctorsTabPlaceholder(modifier: Modifier) =
    ai.strainease.app.ui.components.SWCard(modifier = modifier) {
        Text(
            text = "Doctors (PR-A12)",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }

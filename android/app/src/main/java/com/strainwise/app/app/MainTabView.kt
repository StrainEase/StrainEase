package com.strainwise.app.app

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.strainwise.app.R

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
 *
 * Each tab's content is a stub in PR-A5 — the real screens land
 * in PR-A6 (Home), PR-A7 (Find), PR-A8 (Browse), and PR-A12
 * (Doctors). The stubs render a simple "Tab name" placeholder so
 * the navigation, the bottom bar, and the sheet plumbing can be
 * reviewed on their own.
 */
@Composable
fun MainTabView() {
    val nav = remember { AppNavigation() }
    var selected by remember { mutableStateOf(AppTab.Home) }
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext
        as com.strainwise.app.StrainWiseApplication
    val homeModel = remember { com.strainwise.app.ui.home.HomeModel() }
    val recents = remember { com.strainwise.app.data.RecentlyViewedStore(app) }
    val findModel = remember { com.strainwise.app.ui.find.FindModel() }
    val directoryModel = remember { com.strainwise.app.ui.browse.DirectoryModel() }
    val compareStore = remember { com.strainwise.app.ui.compare.CompareSelectionStore() }
    val doctorsModel = remember { com.strainwise.app.ui.doctors.DoctorsModel() }
    val savedAilments = remember { com.strainwise.app.data.SavedAilmentsStore(app) }
    val savedMedications = remember { com.strainwise.app.data.SavedMedicationsStore(app) }
    val relief = remember { com.strainwise.app.data.ReliefLogStore(app) }

    CompositionLocalProvider(LocalAppNavigation provides nav) {
        Scaffold(
            modifier = Modifier.fillMaxSize(),
            containerColor = MaterialTheme.colorScheme.background,
            bottomBar = {
                Column {
                    com.strainwise.app.ui.compare.CompareTrayBar(
                        store = compareStore,
                        api = com.strainwise.app.StrainWiseApplication.strainAPI,
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
                AppTab.Home -> com.strainwise.app.ui.home.HomeView(
                    model = homeModel,
                    recentlyViewed = recents,
                    modifier = Modifier.padding(padding),
                )
                AppTab.Find -> com.strainwise.app.ui.find.FindView(
                    model = findModel,
                    savedAilments = savedAilments,
                    savedMedications = savedMedications,
                    relief = relief,
                    modifier = Modifier.padding(padding),
                )
                AppTab.Browse -> com.strainwise.app.ui.browse.DirectoryView(
                    model = directoryModel,
                    modifier = Modifier.padding(padding),
                )
                AppTab.Doctors -> com.strainwise.app.ui.doctors.DoctorsView(
                    model = doctorsModel,
                    modifier = Modifier.padding(padding),
                )
            }
        }
    }
}

@Composable
private fun FindTabPlaceholder(modifier: Modifier) =
    com.strainwise.app.ui.components.SWCard(modifier = modifier) {
        Text(
            text = "Find (PR-A7)",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }

@Composable
private fun BrowseTabPlaceholder(modifier: Modifier) =
    com.strainwise.app.ui.components.SWCard(modifier = modifier) {
        Text(
            text = "Browse (PR-A8)",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }

@Composable
private fun DoctorsTabPlaceholder(modifier: Modifier) =
    com.strainwise.app.ui.components.SWCard(modifier = modifier) {
        Text(
            text = "Doctors (PR-A12)",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }

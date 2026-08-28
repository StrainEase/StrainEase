package ai.strainease.app.app

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
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
import androidx.compose.ui.text.font.FontWeight
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
    // iOS surfaces Account and Saved as separate sheets via
    // AppNavigation.showAccount / showSaved. We mirror that here
    // so the AgeVerificationStore / SavedStrainsStore are kept
    // warm and the user has a way to reach account settings.
    var showAccount by remember { mutableStateOf(false) }
    var showSaved by remember { mutableStateOf(false) }
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
    val savedStrains = remember { ai.strainease.app.data.SavedStrainsStore(app) }
    val relief = remember { ai.strainease.app.data.ReliefLogStore(app) }
    val ageStore = remember { ai.strainease.app.compliance.AgeVerificationStore(app) }
    val researchHistory = remember { ai.strainease.app.data.ResearchHistoryStore() }

    val openStrain: (StrainProfile) -> Unit = { openProfile = it }
    val closeStrain: () -> Unit = { openProfile = null }
    val closeAccount: () -> Unit = { showAccount = false }
    val closeSaved: () -> Unit = { showSaved = false }
    // Hardware / gesture back closes the deepest open surface so
    // the user is never trapped behind a sheet / overlay.
    BackHandler(enabled = openProfile != null) { closeStrain() }
    BackHandler(enabled = showAccount) { closeAccount() }
    BackHandler(enabled = showSaved) { closeSaved() }

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
                            researchHistory = researchHistory,
                            currentTab = selected,
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
                        savedAilments = savedAilments,
                        onOpenProfile = openStrain,
                        modifier = Modifier.padding(padding),
                    )
                    AppTab.Find -> ai.strainease.app.ui.find.FindView(
                        model = findModel,
                        savedAilments = savedAilments,
                        savedMedications = savedMedications,
                        relief = relief,
                        compareStore = compareStore,
                        researchHistory = researchHistory,
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
            if (profile == null) {
                // App-level chrome (iOS appChrome() equivalent): a
                // heart that opens the Saved sheet and an
                // initials avatar that opens the Account sheet.
                // Pinned to the top of the tab content so it
                // floats over the screen but never covers the
                // strain detail overlay (which renders its own
                // back chevron).
                AppChromeButtons(
                    showSaved = showSaved,
                    onOpenSaved = { showSaved = true },
                    onOpenAccount = { showAccount = true },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(top = 12.dp, end = 12.dp),
                )
            }
            if (profile != null) {
                Box(modifier = Modifier.fillMaxSize()) {
                    ai.strainease.app.ui.strain.StrainDetailView(
                        profile = profile,
                        api = ai.strainease.app.StrainEaseApplication.strainAPI,
                        recentlyViewed = recents,
                        relief = relief,
                        savedAilments = savedAilments,
                        savedMedications = savedMedications,
                        savedStrains = savedStrains,
                        compareStore = compareStore,
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

        if (showAccount) {
            ModalBottomSheet(
                onDismissRequest = closeAccount,
            ) {
                ai.strainease.app.ui.account.AccountView(
                    savedAilments = savedAilments,
                    savedMedications = savedMedications,
                    savedStrains = savedStrains,
                    relief = relief,
                    ageStore = ageStore,
                    onDismiss = closeAccount,
                    onOpenStrain = { openProfile = it },
                )
            }
        }

        if (showSaved) {
            ModalBottomSheet(
                onDismissRequest = closeSaved,
            ) {
                ai.strainease.app.ui.account.SavedStrainsSheet(
                    savedStrains = savedStrains,
                    onOpen = { openProfile = it },
                    onDismiss = closeSaved,
                )
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

/**
 * App-level chrome: heart icon (opens saved strains) and
 * user-initials avatar (opens account). Mirrors the iOS
 * `appChrome()` modifier that every tab in iOS wears — a
 * single source of truth for the top-bar buttons so the
 * user always has a way out to their profile / saved data.
 */
@Composable
private fun AppChromeButtons(
    showSaved: Boolean,
    onOpenSaved: () -> Unit,
    onOpenAccount: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val session = ai.strainease.app.auth.LocalAuthSession.current
    val name = session.user?.name?.trim().orEmpty()
    val initials = when {
        name.isEmpty() -> "·"
        else -> name.split(" ").let { parts ->
            when {
                parts.size == 1 -> parts[0].take(2).uppercase()
                else -> (parts[0].take(1) + parts[1].take(1)).uppercase()
            }
        }
    }
    androidx.compose.foundation.layout.Row(
        modifier = modifier,
        horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Heart → Saved Strains sheet.
        Surface(
            shape = CircleShape,
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(
                1.dp,
                if (showSaved) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.outline,
            ),
            modifier = Modifier
                .size(40.dp)
                .clickable { onOpenSaved() },
        ) {
            androidx.compose.foundation.layout.Box(
                contentAlignment = Alignment.Center,
            ) {
                androidx.compose.material3.Icon(
                    imageVector = androidx.compose.material.icons.Icons.Filled.Favorite,
                    contentDescription = "Saved strains",
                    tint = if (showSaved) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        // Initials → Account sheet.
        Surface(
            shape = CircleShape,
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            modifier = Modifier
                .size(40.dp)
                .clickable { onOpenAccount() },
        ) {
            androidx.compose.foundation.layout.Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.18f)),
            ) {
                Text(
                    text = initials,
                    style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold),
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
    }
}

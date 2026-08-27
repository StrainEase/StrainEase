package ai.strainease.app.app

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MedicalServices
import androidx.compose.material.icons.filled.Search
import androidx.compose.ui.graphics.vector.ImageVector
import ai.strainease.app.models.StrainProfile

/**
 * The four primary tabs. 1:1 port of the iOS `AppTab` enum, including
 * the title and the system icon used in the bottom bar.
 */
enum class AppTab(val title: String, val systemImage: ImageVector) {
    Home("Home", Icons.Filled.Home),
    Find("Find", Icons.Filled.Search),
    Browse("Browse", Icons.Filled.Book),
    Doctors("Doctors", Icons.Filled.MedicalServices),
}

/** Placeholder for [AppNavigation.pendingResearch] — the real
 *  `RestoredResearch` type lands in PR-A11 alongside
 *  ResearchHistoryStore. Holding the slot here lets the
 *  shell compile before that work ships. */
typealias RestoredResearch = Map<String, String>

/**
 * Process-wide navigation state. 1:1 port of the iOS
 * `AppNavigation.swift` Observable. Holds the current tab, the
 * account / saved sheets, and the cross-tab handoff payload.
 *
 * Cross-tab handoffs:
 *  - [pendingStrain] — Home observes this and pushes the strain
 *    detail once, then clears it. Used when the terpene drill-
 *    down sheet wants to jump to a strain without owning the
 *    Home stack directly.
 *  - [pendingFindAilments] — Account "Find for these" sets this
 *    and switches to the Find tab; Find consumes it on first
 *    frame and clears it.
 *  - [pendingResearch] — Past research entries restore a Find
 *    / Compare payload by setting this; Find consumes it once.
 */
class AppNavigation {
    var tab: AppTab = AppTab.Home
    var showAccount: Boolean = false
    var showSaved: Boolean = false
    var pendingStrain: StrainProfile? = null
    var pendingFindAilments: List<String> = emptyList()
    var pendingResearch: RestoredResearch? = null

    fun openSaved() {
        showSaved = true
    }

    fun openProfile() {
        showAccount = true
    }

    fun openFind(ailments: List<String>) {
        pendingFindAilments = ailments
        showAccount = false
        tab = AppTab.Find
    }

    fun openResearch(research: RestoredResearch) {
        pendingResearch = research
        showAccount = false
        tab = AppTab.Find
    }

    fun consumeFindAilments(): List<String> {
        val next = pendingFindAilments
        pendingFindAilments = emptyList()
        return next
    }

    fun consumeResearch(): RestoredResearch? {
        val next = pendingResearch
        pendingResearch = null
        return next
    }

    fun requestOpenProfile(profile: StrainProfile) {
        pendingStrain = profile
        tab = AppTab.Home
    }

    fun consumePendingStrain(): StrainProfile? {
        val next = pendingStrain
        pendingStrain = null
        return next
    }
}

package ai.strainease.app.app

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import ai.strainease.app.auth.LocalAuthSession
import ai.strainease.app.data.ReliefLogStore
import ai.strainease.app.data.ResearchHistoryStore
import ai.strainease.app.data.SavedAilmentsStore
import ai.strainease.app.data.SavedMedicationsStore
import ai.strainease.app.data.SavedStrainsStore

/**
 * One-shot binder that opens or closes the Firestore listeners on
 * the personal-data stores when the signed-in user changes. Drop
 * it into the root composable so the stores' `savedFlow` /
 * `ailmentsFlow` / `medicationsFlow` / `logFlow` / history all
 * reflect the right user.
 *
 *  - When a user signs in (auth state transitions to SignedIn),
 *    every store's `start(uid)` is called. The new collections
 *    start streaming immediately.
 *  - When the user signs out, every store's `stop()` is called.
 *    The in-memory lists are cleared so the UI doesn't briefly
 *    show the previous user's data on the next user's screens.
 *
 * The iOS equivalent is the implicit `addAuthStateListener` that
 * every `@Observable` store subscribes to inside its `init`.
 * Android stores can't self-subscribe (no iOS `init` lifecycle),
 * so the app shell wires them up here.
 */
@Composable
fun AuthBound(
    savedAilments: SavedAilmentsStore,
    savedMedications: SavedMedicationsStore,
    savedStrains: SavedStrainsStore,
    relief: ReliefLogStore,
    researchHistory: ResearchHistoryStore,
    content: @Composable () -> Unit,
) {
    val session = LocalAuthSession.current
    val uid = (session.status as? ai.strainease.app.auth.SessionStatus.SignedIn)?.user?.uid

    LaunchedEffect(uid) {
        if (uid == null) {
            savedAilments.stop()
            savedMedications.stop()
            savedStrains.stop()
            relief.stop()
            researchHistory.stop()
        } else {
            savedAilments.start(uid)
            savedMedications.start(uid)
            savedStrains.start(uid)
            relief.start(uid)
            researchHistory.start(uid)
        }
    }

    content()
}

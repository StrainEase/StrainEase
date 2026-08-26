package com.strainwise.app.app

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.strainwise.app.auth.AuthSession
import com.strainwise.app.auth.LocalAuthSession
import com.strainwise.app.auth.SessionStatus
import com.strainwise.app.auth.SignInView
import com.strainwise.app.compliance.AgeGateView
import com.strainwise.app.compliance.AgeVerificationStore
import com.strainwise.app.ui.components.MeshBackground

/**
 * The top-level gate. Decides which of three things the user
 * sees right now:
 *
 *  1. The age gate (if [AgeVerificationStore] is not verified)
 *  2. The sign-in screen (if the age gate is verified but
 *     [AuthSession.status] is signed out / loading)
 *  3. The main tab content (signed in)
 *
 * Direct port of the iOS `RootView`. Animations are 350 ms
 * snappy fades so the gate transitions don't feel jumpy.
 */
@Composable
fun RootView(
    ageStore: AgeVerificationStore,
    modifier: Modifier = Modifier,
) {
    val session = LocalAuthSession.current
    val status by session.status.collectAsStateCompat()
    val isVerified = ageStore.isVerified

    Box(modifier = modifier.fillMaxSize()) {
        when {
            !isVerified -> AgeGateView(
                store = ageStore,
                onVerified = { /* StateFlow recomposes us on next frame */ },
            )
            status is SessionStatus.Loading -> LoadingScreen()
            status is SessionStatus.SignedOut -> SignInView(
                session = session,
                onGoogleIdToken = { idToken, accessToken ->
                    session.signInWithGoogle(idToken, accessToken)
                },
            )
            status is SessionStatus.SignedIn -> MainTabView()
        }
    }
}

@Composable
private fun LoadingScreen() {
    Box(modifier = Modifier.fillMaxSize()) {
        MeshBackground()
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            CircularProgressIndicator(
                color = MaterialTheme.colorScheme.primary,
                strokeWidth = 3.dp,
            )
        }
    }
}

@Composable
private fun <T> kotlinx.coroutines.flow.StateFlow<T>.collectAsStateCompat() =
    this.collectAsState(initial = this.value)

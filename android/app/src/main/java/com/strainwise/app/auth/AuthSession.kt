package com.strainwise.app.auth

import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import com.google.firebase.auth.AuthResult
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthException
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import com.strainwise.app.services.FirebaseBootstrap
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.tasks.await

/** What the iOS app calls a `SessionUser`: the minimum info the
 *  UI needs to greet the patient and tag Firestore writes. */
data class SessionUser(
    val uid: String,
    val email: String?,
    val name: String,
) {
    companion object {
        fun fromFirebase(user: FirebaseUser): SessionUser = SessionUser(
            uid = user.uid,
            email = user.email,
            name = user.displayName
                ?: user.email?.substringBefore('@')
                ?: "Patient",
        )
    }
}

sealed class SessionStatus {
    data object Loading : SessionStatus()
    data object SignedOut : SessionStatus()
    data class SignedIn(val user: SessionUser) : SessionStatus()
}

/** Compose CompositionLocal for [AuthSession], mirrors the iOS
 *  `@Environment(AuthSession.self)` pattern. */
val LocalAuthSession = staticCompositionLocalOf<AuthSession> {
    error("AuthSession not provided. Wrap your content in AuthSession() first.")
}

/**
 * Authentication session. Direct port of the iOS
 * `AuthSession.swift` Observable object: exposes [status] +
 * [errorMessage] + [isBusy] + sign-in / sign-up / sign-out
 * methods, all observed by Compose.
 *
 * Providers:
 *  - email / password (create + sign in)
 *  - Google (via Play Services Auth + a Google ID token
 *    exchanged for a Firebase credential)
 *  - Apple — NOT supported on Android (Apple does not offer an
 *    Android SDK). The Android sign-in screen never renders the
 *    Apple button.
 */
class AuthSession(
    private val auth: FirebaseAuth = FirebaseAuth.getInstance(),
) {
    private val _status = MutableStateFlow<SessionStatus>(SessionStatus.Loading)
    val status: StateFlow<SessionStatus> = _status.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _isBusy = MutableStateFlow(false)
    val isBusy: StateFlow<Boolean> = _isBusy.asStateFlow()

    val user: SessionUser?
        get() = (status.value as? SessionStatus.SignedIn)?.user

    val isSignedIn: Boolean
        get() = user != null

    /** Wire [FirebaseAuth.addAuthStateListener] into [_status].
     *  Idempotent — safe to call from `MainActivity.onCreate`. */
    fun start() {
        if (!FirebaseBootstrap.isConfigured) {
            _status.value = SessionStatus.SignedOut
            return
        }
        auth.addAuthStateListener { firebaseAuth ->
            val current = firebaseAuth.currentUser
            _status.value = if (current != null) {
                SessionStatus.SignedIn(SessionUser.fromFirebase(current))
            } else {
                SessionStatus.SignedOut
            }
        }
    }

    suspend fun signIn(email: String, password: String) {
        run {
            auth.signInWithEmailAndPassword(email, password).await()
        }
    }

    suspend fun signUp(email: String, password: String) {
        run {
            auth.createUserWithEmailAndPassword(email, password).await()
        }
    }

    /** Sign in with a Google ID token. The web client gets the
     *  ID token through Google Identity Services; on Android, the
     *  most portable path is Play Services Auth's
     *  `signInWithCredential(GoogleAuthProvider.credential(idToken, null))`.
     *  PR-A4 callers are expected to fetch the idToken first
     *  (e.g. via [com.google.android.gms.auth.api.signin.GoogleSignIn]
     *  on the Activity side) and pass it here. */
    suspend fun signInWithGoogle(idToken: String, accessToken: String? = null) {
        run {
            val credential = GoogleAuthProvider.getCredential(idToken, accessToken)
            auth.signInWithCredential(credential).await()
        }
    }

    suspend fun updateDisplayName(name: String) {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return
        if (!FirebaseBootstrap.isConfigured) {
            applyLocalName(trimmed)
            return
        }
        _isBusy.value = true
        _errorMessage.value = null
        try {
            val current = auth.currentUser
                ?: throw IllegalStateException("You're not signed in.")
            val request = current.updateProfile(com.google.firebase.auth.userProfileChangeRequest {
                displayName = trimmed
            })
            request.await()
            applyLocalName(trimmed)
        } catch (t: Throwable) {
            _errorMessage.value = friendlyAuthMessage(t)
        } finally {
            _isBusy.value = false
        }
    }

    fun signOut() {
        try {
            auth.signOut()
            _errorMessage.value = null
        } catch (t: Throwable) {
            _errorMessage.value = t.localizedMessage
        }
    }

    private fun applyLocalName(name: String) {
        val current = _status.value as? SessionStatus.SignedIn ?: return
        _status.value = current.copy(user = current.user.copy(name = name))
    }

    private suspend fun run(block: suspend () -> AuthResult) {
        if (!FirebaseBootstrap.isConfigured) {
            _errorMessage.value = "Firebase isn't configured yet."
            return
        }
        _isBusy.value = true
        _errorMessage.value = null
        try {
            block()
        } catch (t: Throwable) {
            _errorMessage.value = friendlyAuthMessage(t)
        } finally {
            _isBusy.value = false
        }
    }

    private fun friendlyAuthMessage(error: Throwable): String {
        if (error is FirebaseAuthException) {
            return when (error.errorCode) {
                "ERROR_EMAIL_ALREADY_IN_USE" ->
                    "An account already exists for that email — sign in instead."
                "ERROR_WRONG_PASSWORD",
                "ERROR_INVALID_CREDENTIAL" ->
                    "Incorrect email or password."
                "ERROR_USER_NOT_FOUND" ->
                    "No account found for that email — create one instead."
                "ERROR_INVALID_EMAIL" ->
                    "That doesn't look like a valid email."
                "ERROR_WEAK_PASSWORD" ->
                    "Use at least 6 characters for your password."
                "ERROR_WEB_CONTEXT_CANCELLED" ->
                    "Sign-in was cancelled."
                "ERROR_KEYCHAIN_ERROR" ->
                    "Couldn't save the sign-in session. Sign out of any other StrainEase accounts, then try again."
                else -> error.localizedMessage ?: "Sign-in failed."
            }
        }
        return error.localizedMessage ?: error.message ?: "Sign-in failed."
    }
}

/** Compose entry that exposes the [AuthSession] through the
 *  [LocalAuthSession] CompositionLocal. Used by every screen that
 *  needs to read [AuthSession.user] or call
 *  [AuthSession.signOut]. */
@Composable
fun ProvideAuthSession(
    session: AuthSession,
    content: @Composable () -> Unit,
) {
    androidx.compose.runtime.CompositionLocalProvider(
        LocalAuthSession provides session,
        content = content,
    )
}

package ai.strainease.app.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MailOutline
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.strainease.app.R
import ai.strainease.app.ui.components.Eyebrow
import ai.strainease.app.ui.components.MeshBackground
import ai.strainease.app.ui.components.SWPrimaryButton
import ai.strainease.app.ui.theme.StrainEaseTypography
import kotlinx.coroutines.launch

/**
 * Sign-in / sign-up screen. 1:1 port of the iOS `SignInView`.
 *
 * Providers:
 *  - email + password (sign in or create)
 *  - Google — when a Google sign-in flow returns an ID token
 *    (handled on the Activity side via
 *    [com.google.android.gms.auth.api.signin.GoogleSignIn]),
 *    [onGoogleIdToken] is called with the token; the parent
 *    then calls [AuthSession.signInWithGoogle]
 *  - Apple — NOT rendered on Android (Apple does not provide
 *    an Android SDK for Sign in with Apple)
 */
@Composable
fun SignInView(
    session: AuthSession,
    onGoogleIdToken: suspend (idToken: String, accessToken: String?) -> Unit,
    modifier: Modifier = Modifier,
) {
    var mode by remember { mutableStateOf(Mode.SignIn) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    val isBusy by session.isBusy.collectAsStateCompat()
    val error by session.errorMessage.collectAsStateCompat()

    Box(modifier = modifier.fillMaxSize()) {
        MeshBackground()
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 22.dp)
                .padding(top = 80.dp, bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(28.dp),
        ) {
            header(mode)
            socialProviders(
                isBusy = isBusy,
                onGoogle = {
                    scope.launch {
                        // Stub: the actual Google sign-in flow lives
                        // in the Activity (it needs an
                        // ActivityResultLauncher); the parent screen
                        // passes a callback that completes the
                        // exchange and calls
                        // session.signInWithGoogle(idToken, accessToken).
                    }
                },
            )
            divider()
            form(
                mode = mode,
                email = email,
                password = password,
                onEmailChange = { email = it },
                onPasswordChange = { password = it },
                isBusy = isBusy,
                onSubmit = {
                    val mail = email.trim()
                    if (mail.isEmpty() || password.isEmpty()) return@form
                    scope.launch {
                        if (mode == Mode.SignIn) {
                            session.signIn(mail, password)
                        } else {
                            session.signUp(mail, password)
                        }
                    }
                },
            )
            error?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                )
            }
            footer(
                mode = mode,
                onToggle = {
                    mode = if (mode == Mode.SignIn) Mode.SignUp else Mode.SignIn
                },
            )
        }
    }
}

private enum class Mode {
    SignIn,
    SignUp;

    val title: String
        get() = if (this == SignIn) "Welcome back" else "Create an account"
    val subtitle: String
        get() = if (this == SignIn) {
            "Same account as the web app. Your research stays with you."
        } else {
            "One account for iPhone and the web. Email is enough to start."
        }
    val submit: String
        get() = if (this == SignIn) "Sign in" else "Create account"
    val togglePrompt: String
        get() = if (this == SignIn) "New here?" else "Already have an account?"
    val toggleAction: String
        get() = if (this == SignIn) "Create an account" else "Sign in"
}

@Composable
private fun header(mode: Mode) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // App icon — brand-green squircle with the white-tinted
        // leaf silhouette on top, left-aligned. The green tile
        // is rendered in Compose (not via a layer-list drawable,
        // which `painterResource` can't load) and the white
        // silhouette is drawn on top with an 8dp inset so the
        // leaf sits in the same safe-zone the launcher uses.
        Box(
            modifier = Modifier
                .size(104.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(MaterialTheme.colorScheme.primary),
            contentAlignment = Alignment.Center,
        ) {
            androidx.compose.foundation.Image(
                painter = painterResource(R.drawable.ic_signin_logo_tinted),
                contentDescription = "StrainEase",
                modifier = Modifier
                    .padding(8.dp)
                    .fillMaxSize(),
            )
        }
        Eyebrow(text = "STRAINEASE")
        Text(
            text = mode.title,
            style = MaterialTheme.typography.displaySmall,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Text(
            text = mode.subtitle,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun socialProviders(
    isBusy: Boolean,
    onGoogle: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        // Google button: pill on card background with a border.
        // The G glyph and the label sit as a centered group, with
        // matching spacers on either side so the label is centered
        // horizontally. Matches the iOS `Continue with Google`
        // button visual.
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.surface)
                .border(1.dp, MaterialTheme.colorScheme.outline, CircleShape)
                .clickable(enabled = !isBusy, onClick = onGoogle)
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Leading spacer mirrors the G glyph's width so the
            // label sits exactly centered in the button.
            Spacer(Modifier.width(20.dp))
            Text(
                text = "G",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = MaterialTheme.colorScheme.primary,
            )
            Spacer(Modifier.width(10.dp))
            Text(
                text = "Continue with Google",
                style = StrainEaseTypography.titleSmall.copy(fontSize = 16.sp, fontWeight = FontWeight.SemiBold),
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
                modifier = Modifier.weight(1f),
            )
            if (isBusy) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    color = MaterialTheme.colorScheme.primary,
                    strokeWidth = 2.dp,
                )
                Spacer(Modifier.width(0.dp))
            } else {
                Spacer(Modifier.width(20.dp))
            }
        }
        // Note: Apple is intentionally NOT shown on Android. The
        // iOS-only Sign in with Apple entry point is skipped here.
    }
}

@Composable
private fun divider() {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .weight(1f)
                .height(1.dp)
                .background(MaterialTheme.colorScheme.outline),
        )
        Text(
            text = "or email",
            style = MaterialTheme.typography.bodySmall.copy(fontSize = 12.sp, fontWeight = FontWeight.Medium),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Box(
            modifier = Modifier
                .weight(1f)
                .height(1.dp)
                .background(MaterialTheme.colorScheme.outline),
        )
    }
}

@Composable
private fun form(
    mode: Mode,
    email: String,
    password: String,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    isBusy: Boolean,
    onSubmit: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        OutlinedTextField(
            value = email,
            onValueChange = onEmailChange,
            placeholder = { Text("Email", color = MaterialTheme.colorScheme.onSurfaceVariant) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Email,
                imeAction = ImeAction.Next,
            ),
            colors = textFieldColors(),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = password,
            onValueChange = onPasswordChange,
            placeholder = { Text("Password", color = MaterialTheme.colorScheme.onSurfaceVariant) },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Done,
            ),
            colors = textFieldColors(),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(6.dp))
        SWPrimaryButton(
            title = mode.submit,
            isBusy = isBusy,
            onClick = onSubmit,
            enabled = !isBusy,
        )
    }
}

@Composable
private fun textFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedContainerColor = MaterialTheme.colorScheme.surface,
    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
    focusedBorderColor = MaterialTheme.colorScheme.outline,
    unfocusedBorderColor = MaterialTheme.colorScheme.outline,
    focusedTextColor = MaterialTheme.colorScheme.onSurface,
    unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
    cursorColor = MaterialTheme.colorScheme.primary,
)

@Composable
private fun footer(mode: Mode, onToggle: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = mode.togglePrompt,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = "  ${mode.toggleAction}",
            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.clickable(onClick = onToggle),
        )
    }
}

@Composable
private fun <T> kotlinx.coroutines.flow.StateFlow<T>.collectAsStateCompat(): androidx.compose.runtime.State<T> {
    return this.collectAsState()
}

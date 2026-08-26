package com.strainwise.app.compliance

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.outlined.CheckBoxOutlineBlank
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.strainwise.app.ui.components.Eyebrow
import com.strainwise.app.ui.components.MeshBackground
import com.strainwise.app.ui.components.SWCard
import com.strainwise.app.ui.components.SWErrorBanner
import com.strainwise.app.ui.components.SWPrimaryButton
import com.strainwise.app.ui.theme.StrainWiseTypography
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.ZoneId

/**
 * Full-screen age-verification gate. 1:1 port of the iOS
 * `AgeGateView`. Local gate is the source of truth — no
 * server-side custom claim enforcement.
 *
 * Flow:
 *  1. User picks a region from the dropdown.
 *  2. User picks a date of birth. The date picker is capped at
 *     today so a future date is structurally impossible to
 *     enter; the failure case still exists because Compose's
 *     DatePicker can be in a "no value set" state on first
 *     launch.
 *  3. User ticks the two agreement checkboxes.
 *  4. User taps the primary button. [AgeVerificationStore.verify]
 *     runs the age math; on failure, the banner shows and the
 *     picker resets (for input errors) or stays (for
 *     underage lockouts).
 */
@Composable
fun AgeGateView(
    store: AgeVerificationStore,
    onVerified: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var region by remember { mutableStateOf(AgeRegion.US) }
    var birthDate by remember { mutableStateOf(LocalDate.now(ZoneId.systemDefault()).minusYears(25)) }
    var termsAccepted by remember { mutableStateOf(false) }
    var privacyAccepted by remember { mutableStateOf(false) }
    var failure by remember { mutableStateOf<AgeFailure?>(null) }
    var submitting by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) { store.refresh() }

    val canSubmit = !submitting && termsAccepted && privacyAccepted

    Box(modifier = modifier.fillMaxSize()) {
        MeshBackground()
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 22.dp, vertical = 28.dp),
            verticalArrangement = Arrangement.spacedBy(22.dp),
        ) {
            header()
            form(
                region = region,
                onRegionChange = { region = it },
                birthDate = birthDate,
                onBirthDateChange = { birthDate = it },
                termsAccepted = termsAccepted,
                onTermsChange = { termsAccepted = it },
                privacyAccepted = privacyAccepted,
                onPrivacyChange = { privacyAccepted = it },
            )
            Spacer(Modifier.height(4.dp))
            SWPrimaryButton(
                title = "I'm ${region.minimumAge} or older — enter StrainEase",
                onClick = {
                    if (!canSubmit) return@SWPrimaryButton
                    failure = null
                    submitting = true
                    scope.launch {
                        val result = store.verify(region, birthDate)
                        submitting = false
                        when (result) {
                            is AgeVerificationStore.VerifyResult.Success -> onVerified()
                            is AgeVerificationStore.VerifyResult.Failure -> {
                                failure = result.reason
                                if (result.reason is AgeFailure.Underage) return@launch
                                // Re-prompt: reset the picker to a sane
                                // default so the user re-enters instead of
                                // editing the bad value in place.
                                birthDate = LocalDate.now(ZoneId.systemDefault()).minusYears(25)
                            }
                        }
                    }
                },
                enabled = canSubmit,
            )
            failure?.let { ErrorBannerFor(it) }
            footer()
        }
    }
}

@Composable
private fun header() {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Eyebrow(text = "Age verification required")
        Text(
            text = "Welcome to StrainEase",
            style = MaterialTheme.typography.displaySmall,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Text(
            text = "StrainEase provides cannabis research information intended for adults of legal age in their jurisdiction. Please confirm your age before continuing.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun form(
    region: AgeRegion,
    onRegionChange: (AgeRegion) -> Unit,
    birthDate: LocalDate,
    onBirthDateChange: (LocalDate) -> Unit,
    termsAccepted: Boolean,
    onTermsChange: (Boolean) -> Unit,
    privacyAccepted: Boolean,
    onPrivacyChange: (Boolean) -> Unit,
) {
    SWCard(emphasized = true) {
        Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
            RegionPicker(region = region, onRegionChange = onRegionChange)
            BirthdatePicker(
                birthDate = birthDate,
                onBirthDateChange = onBirthDateChange,
                region = region,
            )
            AgreementToggle(
                text = "I agree to the Terms of Service.",
                checked = termsAccepted,
                onCheckedChange = onTermsChange,
            )
            AgreementToggle(
                text = "I've read the Privacy Policy.",
                checked = privacyAccepted,
                onCheckedChange = onPrivacyChange,
            )
        }
    }
}

@Composable
private fun RegionPicker(
    region: AgeRegion,
    onRegionChange: (AgeRegion) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = "Where are you located?",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(MaterialTheme.colorScheme.surface)
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(14.dp))
                .clickable { expanded = true }
                .padding(horizontal = 14.dp, vertical = 12.dp),
        ) {
            Text(
                text = "${region.label}  ·  ${region.minimumAge}+",
                style = StrainWiseTypography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.background(MaterialTheme.colorScheme.surface),
        ) {
            AgeRegion.entries.forEach { code ->
                DropdownMenuItem(
                    text = {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text(code.label)
                            Text(
                                "${code.minimumAge}+",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    },
                    onClick = {
                        onRegionChange(code)
                        expanded = false
                    },
                )
            }
        }
        Text(
            text = region.legalNote,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun BirthdatePicker(
    birthDate: LocalDate,
    onBirthDateChange: (LocalDate) -> Unit,
    region: AgeRegion,
) {
    var showPicker by remember { mutableStateOf(false) }
    val today = LocalDate.now(ZoneId.systemDefault())
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = "What's your date of birth?",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(MaterialTheme.colorScheme.surface)
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(14.dp))
                .clickable { showPicker = true }
                .padding(horizontal = 14.dp, vertical = 12.dp),
        ) {
            Text(
                text = birthDate.toString(),
                style = StrainWiseTypography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
        }
        if (showPicker) {
            androidx.compose.material3.DatePickerDialog(
                onDismissRequest = { showPicker = false },
                confirmButton = {
                    androidx.compose.material3.TextButton(onClick = { showPicker = false }) {
                        Text("Done")
                    }
                },
                dismissButton = {
                    androidx.compose.material3.TextButton(onClick = { showPicker = false }) {
                        Text("Cancel")
                    }
                },
            ) {
                val state = androidx.compose.material3.rememberDatePickerState(
                    initialSelectedDateMillis = birthDate
                        .atStartOfDay(ZoneId.of("UTC"))
                        .toInstant()
                        .toEpochMilli(),
                    selectableDates = object : androidx.compose.material3.SelectableDates {
                        override fun isSelectableDate(utcTimeMillis: Long): Boolean {
                            val date = java.time.Instant.ofEpochMilli(utcTimeMillis)
                                .atZone(ZoneId.of("UTC")).toLocalDate()
                            return !date.isAfter(today)
                        }
                    },
                )
                androidx.compose.material3.DatePicker(state = state)
                LaunchedEffect(state.selectedDateMillis) {
                    state.selectedDateMillis?.let { millis ->
                        val date = java.time.Instant.ofEpochMilli(millis)
                            .atZone(ZoneId.of("UTC")).toLocalDate()
                        onBirthDateChange(date)
                    }
                }
            }
        }
        Text(
            text = "Must be at least ${region.minimumAge} for your region.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun AgreementToggle(
    text: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    val primary = MaterialTheme.colorScheme.primary
    val mutedFg = MaterialTheme.colorScheme.onSurfaceVariant
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onCheckedChange(!checked) }
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(
            imageVector = if (checked) Icons.Filled.Check else Icons.Outlined.CheckBoxOutlineBlank,
            contentDescription = if (checked) "Checked" else "Unchecked",
            tint = if (checked) primary else mutedFg,
            modifier = Modifier.size(22.dp),
        )
        Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun ErrorBannerFor(failure: AgeFailure) {
    val (title, body) = when (failure) {
        AgeFailure.MissingBirthDate -> "We need your date of birth" to
            "Please enter your full date of birth so we can confirm you're of legal age in your jurisdiction."
        AgeFailure.Invalid -> "Let's try that again" to
            "Please re-enter a valid date of birth."
        AgeFailure.Future -> "That date is in the future" to
            "Please re-enter your date of birth — that one is still ahead of us."
        AgeFailure.Underage -> "Sorry — StrainEase is for adults only" to
            "If you are under the legal age for your region, please don't continue."
    }
    SWErrorBanner(message = "$title · $body")
}

@Composable
private fun footer() {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            text = "StrainEase is a research tool. It does not sell or dispense cannabis products. You may need to re-verify in 30 days.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = "Keep all cannabis products out of the reach of children and pets. If accidentally consumed, contact Poison Control (1-800-222-1222 in the US) or your local emergency line.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

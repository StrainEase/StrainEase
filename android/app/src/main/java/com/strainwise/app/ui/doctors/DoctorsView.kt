package com.strainwise.app.ui.doctors

import android.net.Uri
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.strainwise.app.models.Doctor
import com.strainwise.app.ui.components.Eyebrow
import com.strainwise.app.ui.components.MeshBackground
import com.strainwise.app.ui.components.SWCard
import com.strainwise.app.ui.components.SWErrorBanner
import com.strainwise.app.ui.components.SWField
import com.strainwise.app.ui.components.SWPrimaryButton
import com.strainwise.app.ui.components.SectionLabel
import com.strainwise.app.ui.theme.StrainWiseTypography
import kotlinx.coroutines.launch

/**
 * Doctors tab. 1:1 port of the iOS `DoctorsView`:
 *  - hero
 *  - "Use my location" CTA + city / state input
 *  - radius chips (10 / 25 / 50 / 100 mi)
 *  - result cards
 *
 * PR-A13 polish can wire the in-app location permission
 * request; PR-A9 lands first and treats the location
 * request as best-effort.
 */
@Composable
fun DoctorsView(
    model: DoctorsModel,
    modifier: Modifier = Modifier,
) {
    val status by model.status.collectAsState()
    val result by model.result.collectAsState()
    val error by model.errorMessage.collectAsState()
    val city by model.city.collectAsState()
    val state by model.state.collectAsState()
    val radius by model.radiusMiles.collectAsState()
    val scope = rememberCoroutineScope()

    Box(modifier = modifier.fillMaxSize()) {
        MeshBackground()
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            hero()
            SWCard(emphasized = true) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SectionLabel(title = "Search near", index = 1)
                    SWPrimaryButton(
                        title = "Use my location",
                        icon = Icons.Filled.LocationOn,
                        isBusy = status == DoctorsModel.Status.Locating,
                        enabled = status != DoctorsModel.Status.Searching,
                        onClick = { scope.launch { model.useMyLocation() } },
                    )
                    Text(
                        text = "or",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        SWField(
                            value = city,
                            onValueChange = model::setCity,
                            placeholder = "City",
                            modifier = Modifier.weight(1f),
                        )
                        SWField(
                            value = state,
                            onValueChange = model::setState,
                            placeholder = "State",
                            modifier = Modifier.weight(1f),
                        )
                    }
                    Text(
                        text = "Within",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(10.0, 25.0, 50.0, 100.0).forEach { miles ->
                            RadiusChip(
                                label = "$miles mi",
                                selected = radius == miles,
                                onClick = { model.setRadius(miles) },
                            )
                        }
                    }
                    SWPrimaryButton(
                        title = "Search",
                        isBusy = status == DoctorsModel.Status.Searching,
                        enabled = status != DoctorsModel.Status.Searching,
                        onClick = { scope.launch { model.searchByCity() } },
                    )
                }
            }
            error?.let { SWErrorBanner(message = it) }
            result?.doctors?.takeIf { it.isNotEmpty() }?.let { doctors ->
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SectionLabel(title = "Nearby clinics", index = 2)
                    doctors.forEach { DoctorCard(doctor = it) }
                }
            }
            if (status == DoctorsModel.Status.Searching) {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            }
        }
    }
}

@Composable
private fun hero() {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Eyebrow(text = "StrainEase clinic finder")
        Text(
            text = "Find a clinic",
            style = MaterialTheme.typography.displaySmall,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Text(
            text = "StrainEase lists medical-marijuana doctors from Leafly's public directory. We don't refer or endorse — pick one that fits your needs.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun RadiusChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val primary = MaterialTheme.colorScheme.primary
    val onPrimary = MaterialTheme.colorScheme.onPrimary
    val card = MaterialTheme.colorScheme.surface
    val border = MaterialTheme.colorScheme.outline
    Text(
        text = label,
        style = MaterialTheme.typography.labelMedium,
        color = if (selected) onPrimary else MaterialTheme.colorScheme.onSurface,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (selected) primary else card)
            .border(1.dp, if (selected) primary else border, RoundedCornerShape(50))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp),
    )
}

@Composable
private fun DoctorCard(doctor: Doctor) {
    val context = LocalContext.current
    SWCard {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = doctor.name,
                    style = StrainWiseTypography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f),
                )
                if (doctor.rating != null) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Filled.Star,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(14.dp),
                        )
                        Spacer(Modifier.size(2.dp))
                        Text(
                            text = "%.1f".format(doctor.rating),
                            style = StrainWiseTypography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                    }
                }
            }
            Text(
                text = doctor.addressLine,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (!doctor.reviewSnippet.isNullOrEmpty()) {
                Text(
                    text = "\"${doctor.reviewSnippet}\"",
                    style = StrainWiseTypography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Open in Maps",
                    style = StrainWiseTypography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .clickable {
                            doctor.mapsUri?.let { uri ->
                                runCatching {
                                    context.startActivity(
                                        android.content.Intent(
                                            android.content.Intent.ACTION_VIEW,
                                            uri,
                                        ),
                                    )
                                }
                            }
                        }
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                )
                Text(
                    text = "View on Leafly",
                    style = StrainWiseTypography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .clickable {
                            runCatching {
                                context.startActivity(
                                    android.content.Intent(
                                        android.content.Intent.ACTION_VIEW,
                                        Uri.parse(doctor.url),
                                    ),
                                )
                            }
                        }
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                )
            }
        }
    }
}

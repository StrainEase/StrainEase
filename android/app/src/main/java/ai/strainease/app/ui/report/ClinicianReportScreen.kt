package ai.strainease.app.ui.report

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import ai.strainease.app.StrainAILanguage
import ai.strainease.app.StrainEaseApplication
import ai.strainease.app.data.ClinicianReportPdf
import ai.strainease.app.ui.components.Eyebrow
import ai.strainease.app.ui.components.MeshBackground
import ai.strainease.app.ui.components.SWCard
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream

/**
 * Generate-then-open UX for the Clinician Report PDF. Mirrors the
 * web `/report` page and the iOS `ClinicianReportView` so every
 * platform downloads the same document.
 *
 * The Compose screen is a thin shell: the real work happens on the
 * server (Cloud Function `generateClinicianReportPdf`). We just call
 * it, write the bytes to a cache file, and hand the file to the
 * system PDF viewer via a `FileProvider` + `ACTION_VIEW` intent.
 */
@Composable
fun ClinicianReportScreen(
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val api = remember { StrainEaseApplication.strainAPI }
    val authSession = ai.strainease.app.auth.LocalAuthSession.current
    val signedIn = authSession.user != null

    var isGenerating by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var lastResult by remember { mutableStateOf<ClinicianReportPdf?>(null) }

    Column(modifier = modifier.fillMaxSize()) {
        MeshBackground()
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            headerRow(onDismiss)
            headerCopy()
            primaryButton(
                isGenerating = isGenerating,
                enabled = signedIn,
                onClick = {
                    if (!isGenerating) {
                        scope.launch {
                            isGenerating = true
                            errorMessage = null
                            try {
                                val result = withContext(Dispatchers.IO) {
                                    api.clinicianReportPdf(
                                        language = StrainAILanguage.English,
                                        includeKayaSummary = true,
                                    )
                                }
                                lastResult = result
                                withContext(Dispatchers.IO) {
                                    openPdfInSystemViewer(context, result)
                                }
                            } catch (t: Throwable) {
                                errorMessage = t.message ?: t::class.java.simpleName
                            } finally {
                                isGenerating = false
                            }
                        }
                    }
                },
            )
            lastResult?.let { SuccessCard(it) }
            errorMessage?.let { ErrorCard(it) }
            WhatYouGetCard()
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
private fun headerRow(onDismiss: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Eyebrow(text = "Share with your clinician")
        androidx.compose.material3.IconButton(onClick = onDismiss) {
            Icon(
                imageVector = Icons.Filled.Description,
                contentDescription = "Close",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun headerCopy() {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            text = "Clinician report",
            style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.SemiBold),
            color = MaterialTheme.colorScheme.onSurface,
        )
        Text(
            text = "A one-page PDF with your saved conditions, medications, daily check-ins, and relief logs — plus Dr. Kaya's clinical summary in plain language. Built on our servers, identical to the web app.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun primaryButton(
    isGenerating: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Button(
        onClick = onClick,
        enabled = enabled && !isGenerating,
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
        ),
        modifier = Modifier.fillMaxWidth(),
    ) {
        if (isGenerating) {
            CircularProgressIndicator(
                color = MaterialTheme.colorScheme.onPrimary,
                strokeWidth = 2.dp,
                modifier = Modifier.size(18.dp),
            )
            Spacer(Modifier.size(8.dp))
            Text("Generating…", fontWeight = FontWeight.SemiBold)
        } else {
            Icon(
                imageVector = Icons.Filled.Description,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
            )
            Spacer(Modifier.size(8.dp))
            Text("Generate PDF", fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun SuccessCard(result: ClinicianReportPdf) {
    SWCard {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Filled.CheckCircle,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                )
                Spacer(Modifier.size(8.dp))
                Text(
                    text = "Report ready",
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
            Text(
                text = "${result.filename} · ${formatBytes(result.byteLength)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = if (result.kayaIncluded) {
                    "Includes Dr. Kaya's clinical summary."
                } else {
                    "Structured snapshot only (Dr. Kaya summary unavailable)."
                },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = "If the PDF didn't open automatically, tap Generate PDF again to retry.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun ErrorCard(message: String) {
    SWCard {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Filled.ErrorOutline,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.error,
                )
                Spacer(Modifier.size(8.dp))
                Text(
                    text = "Couldn't generate the report",
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
            Text(
                text = message,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun WhatYouGetCard() {
    SWCard {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                text = "What your clinician will see",
                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                color = MaterialTheme.colorScheme.onSurface,
            )
            for (bullet in BULLETS) {
                Text(
                    text = "•  $bullet",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

private val BULLETS: List<String> = listOf(
    "StrainEase logo + your name + generated date header.",
    "Patient facts: display name, email, age context, report window.",
    "Active conditions and current medications.",
    "14-day check-in trend + 4 metric averages.",
    "30-day relief log table + pattern analysis.",
    "Saved strains with the actual note text you wrote.",
    "Dr. Kaya's 2-3 paragraph clinical summary + 3-5 considerations.",
)

/**
 * Write the PDF bytes to the app cache and launch a `VIEW` intent
 * via a `FileProvider` so the system PDF viewer (Drive, Adobe,
 * QuickOffice, etc.) opens the file. Falls back to a chooser
 * intent if no viewer can handle `application/pdf` directly.
 */
private fun openPdfInSystemViewer(context: Context, result: ClinicianReportPdf) {
    val dir = File(context.cacheDir, "reports").apply { mkdirs() }
    val outFile = File(dir, result.filename)
    FileOutputStream(outFile).use { stream -> stream.write(result.pdfBytes) }
    val authority = "${context.packageName}.fileprovider"
    val uri = FileProvider.getUriForFile(context, authority, outFile)
    val viewIntent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(uri, "application/pdf")
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    val chooser = Intent.createChooser(viewIntent, "Open report with").apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    try {
        context.startActivity(chooser)
    } catch (e: ActivityNotFoundException) {
        // No PDF viewer installed — surface as a generic share so the
        // user can pick Drive / Files / email from the system chooser.
        val share = Intent(Intent.ACTION_SEND).apply {
            type = "application/pdf"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(share, "Share report").apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        })
    }
}

private fun formatBytes(bytes: Int): String {
    val kb = bytes / 1024.0
    return when {
        kb < 1024 -> "%.0f KB".format(kb)
        else -> "%.1f MB".format(kb / 1024)
    }
}

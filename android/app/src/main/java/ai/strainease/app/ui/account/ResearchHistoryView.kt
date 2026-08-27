package com.strainwise.app.ui.account

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.strainwise.app.app.LocalAppNavigation
import com.strainwise.app.app.RestoredResearch
import com.strainwise.app.data.HistoryEntry
import com.strainwise.app.data.ResearchHistoryStore
import com.strainwise.app.ui.components.MeshBackground
import com.strainwise.app.ui.components.SWCard
import com.strainwise.app.ui.components.SWErrorBanner
import com.strainwise.app.ui.components.SectionLabel
import com.strainwise.app.ui.theme.StrainWiseTypography
import kotlinx.coroutines.launch

/**
 * Full-screen Past research list. 1:1 port of the iOS
 * `ResearchHistoryView`. Lists the user's last Find / Compare
 * runs (the same `users/{uid}/history/{id}` collection the
 * backend writes after every successful run) and re-opens the
 * original result on tap by reading `researchResults/{id}` and
 * pushing the [RestoredResearch] payload through the navigation
 * handoff.
 *
 * Shown as a NavigationStack destination from the Account sheet
 * so the user can drill in from the "Past research" row without
 * leaving their account context.
 */
@Composable
fun ResearchHistoryView(
    history: ResearchHistoryStore,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val nav = LocalAppNavigation.current
    val entries by history.entries.collectAsState()
    val error by history.errorMessage.collectAsState()
    val scope = rememberCoroutineScope()
    var loadingId by remember { mutableStateOf<String?>(null) }

    Box(modifier = modifier.fillMaxSize()) {
        MeshBackground()
        Column(modifier = Modifier.fillMaxSize()) {
            headerRow(
                title = "Past research",
                onBack = onBack,
            )
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                if (entries.isEmpty()) {
                    item {
                        SWCard {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    text = "No past searches yet",
                                    style = StrainWiseTypography.titleMedium,
                                    color = MaterialTheme.colorScheme.onSurface,
                                )
                                Text(
                                    text = "After you find or compare strains, they land here so you can reopen the exact result.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
                error?.let { err ->
                    item {
                        Text(
                            text = err,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                }
                items(entries, key = { it.id }) { entry ->
                    HistoryRow(
                        entry = entry,
                        isLoading = loadingId == entry.id,
                        onClick = {
                            if (loadingId != null) return@HistoryRow
                            loadingId = entry.id
                            scope.launch {
                                val restored = history.loadResearch(entry.id)
                                loadingId = null
                                if (restored != null) {
                                    nav.openResearch(restored)
                                    onBack()
                                }
                            }
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun headerRow(title: String, onBack: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 8.dp),
    ) {
        Surface(
            shape = CircleShape,
            color = MaterialTheme.colorScheme.surface,
            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            modifier = Modifier
                .size(40.dp)
                .clickable(onClick = onBack),
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = Icons.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
        Spacer(Modifier.size(12.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onBackground,
        )
    }
}

@Composable
private fun HistoryRow(
    entry: HistoryEntry,
    isLoading: Boolean,
    onClick: () -> Unit,
) {
    SWCard(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = entry.title,
                    style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold),
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = "${entry.kind.label} · ${formatTimestamp(entry.createdAt)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (isLoading) {
                CircularProgressIndicator(
                    color = MaterialTheme.colorScheme.primary,
                    strokeWidth = 2.dp,
                    modifier = Modifier.size(18.dp),
                )
            } else {
                Icon(
                    imageVector = Icons.Filled.History,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(18.dp),
                )
            }
        }
    }
}

private fun formatTimestamp(millis: Long): String {
    if (millis <= 0) return "—"
    val date = java.util.Date(millis)
    val format = java.text.SimpleDateFormat("MMM d, h:mm a", java.util.Locale.getDefault())
    return format.format(date)
}

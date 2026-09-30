package ai.strainease.app.ui.strain

import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.strainease.app.models.StrainProfile
import ai.strainease.app.ui.components.SWCard
import ai.strainease.app.ui.components.SectionLabel
import ai.strainease.app.ui.theme.StrainEaseTypography

/**
 * "Where to look" card on the strain detail page. Direct
 * port of the iOS `ShopLinksView`. Opens Leafly and
 * Weedmaps searches for the strain when tapped. PR-A10
 * will add the in-app dispensary locator for US patients.
 */
@Composable
fun ShopLinksView(
    profile: StrainProfile,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    SWCard(modifier = modifier) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            SectionLabel(title = "Where to look", index = 4)
            Text(
                text = "StrainEase doesn't sell product — these are read-first research sources.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            ShopLink(
                label = "Leafly",
                detail = "Read the patient reviews for ${profile.name}",
                onClick = {
                    val url = "https://www.leafly.com/strains/${profile.slug}"
                    runCatching {
                        context.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, Uri.parse(url)))
                    }
                },
            )
            ShopLink(
                label = "Weedmaps",
                detail = "Search ${profile.name} on Weedmaps",
                onClick = {
                    val url = "https://weedmaps.com/search?query=${Uri.encode(profile.name)}"
                    runCatching {
                        context.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, Uri.parse(url)))
                    }
                },
            )
        }
    }
}

@Composable
private fun ShopLink(
    label: String,
    detail: String,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(50))
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = label.first().toString(),
                style = StrainEaseTypography.titleMedium.copy(fontSize = 18.sp),
                color = MaterialTheme.colorScheme.primary,
            )
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label,
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = detail,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

package ai.strainease.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.strainease.app.models.StrainType
import ai.strainease.app.ui.theme.StrainEaseTypography
import ai.strainease.app.ui.theme.TypeStyle

/**
 * Small strain-type chip ("Indica" / "Sativa" / "Hybrid"). Direct
 * port of the iOS `TypeBadge` view used on strain cards, the
 * CompareTrayBar, and various search results.
 *
 *  - Text: 11pt semibold, color = strain type color
 *  - Surface: strain type color at 0.12 alpha
 *  - Border: strain type color at 0.25 alpha, 1dp
 */
@Composable
fun TypeBadge(
    type: StrainType?,
    modifier: Modifier = Modifier,
) {
    val darkTheme = isSystemInDarkTheme()
    val color = TypeStyle.color(type, darkTheme)
    Text(
        text = TypeStyle.label(type),
        style = StrainEaseTypography.labelSmall.copy(fontSize = 11.sp),
        color = color,
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(color.copy(alpha = 0.12f))
            .border(1.dp, color.copy(alpha = 0.25f), RoundedCornerShape(50))
            .padding(horizontal = 8.dp, vertical = 4.dp),
    )
}

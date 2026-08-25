package com.strainwise.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.strainwise.app.ui.theme.StrainWiseTypography

/**
 * Small uppercase tag rendered above headlines. Mirrors the iOS
 * `Eyebrow` view used in the Home hero, Find view, and various
 * detail headers.
 *
 *  - Text: 11pt semibold, +2.0 letter-spacing
 *  - Surface: accent pill at 0.7 alpha
 *  - Border: primary at 0.18 alpha, 1dp
 */
@Composable
fun Eyebrow(
    text: String,
    modifier: Modifier = Modifier,
) {
    val primary = MaterialTheme.colorScheme.primary
    val tertiary = MaterialTheme.colorScheme.tertiary
    Text(
        text = text.uppercase(),
        style = StrainWiseTypography.labelSmall.copy(
            fontSize = 11.sp,
            letterSpacing = 2.0.sp,
        ),
        color = primary,
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(tertiary.copy(alpha = 0.7f))
            .border(1.dp, primary.copy(alpha = 0.18f), RoundedCornerShape(50))
            .padding(horizontal = 10.dp, vertical = 5.dp),
    )
}

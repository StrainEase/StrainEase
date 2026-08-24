package com.strainwise.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.strainwise.app.ui.theme.StrainWiseTypography

/**
 * Single-line or multi-line text field. Mirrors the iOS `SWField`
 * used for sign-in, the ailment editor, the medication list, the
 * relief log notes, the Find "patient note" / "owned strains" /
 * "medications" boxes, and the StrainMeaning free-text box.
 *
 *  - Optional 12pt label above the field (mutedForeground)
 *  - 14pt body text (or `bodySmall` for multi-line)
 *  - Card background + 14dp rounded corners + 1dp border
 *  - When `multiLine = true`, the field grows 2-4 lines tall
 */
@Composable
fun SWField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    label: String? = null,
    multiLine: Boolean = false,
    minLines: Int = 1,
    maxLines: Int = if (multiLine) 4 else 1,
) {
    val card = MaterialTheme.colorScheme.surface
    val border = MaterialTheme.colorScheme.outline
    val mutedFg = MaterialTheme.colorScheme.onSurfaceVariant
    val fg = MaterialTheme.colorScheme.onSurface

    Column(modifier = modifier) {
        if (label != null) {
            Text(
                text = label,
                style = StrainWiseTypography.labelSmall.copy(fontSize = 12.sp),
                color = mutedFg,
                modifier = Modifier.padding(start = 4.dp, bottom = 6.dp),
            )
        }
        TextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = {
                Text(
                    text = placeholder,
                    style = StrainWiseTypography.bodyMedium,
                    color = mutedFg,
                )
            },
            singleLine = !multiLine,
            minLines = minLines,
            maxLines = maxLines,
            textStyle = if (multiLine) {
                StrainWiseTypography.bodyMedium
            } else {
                StrainWiseTypography.bodyMedium.copy(fontSize = 14.sp)
            },
            colors = TextFieldDefaults.colors(
                focusedContainerColor = card,
                unfocusedContainerColor = card,
                disabledContainerColor = card,
                focusedIndicatorColor = border,
                unfocusedIndicatorColor = border,
                focusedTextColor = fg,
                unfocusedTextColor = fg,
                cursorColor = MaterialTheme.colorScheme.primary,
            ),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(card)
                .border(1.dp, border, RoundedCornerShape(14.dp)),
        )
    }
}

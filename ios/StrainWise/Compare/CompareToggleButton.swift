import SwiftUI

/// Toolbar button that adds or removes the current strain from the shared
/// compare selection. Lives only in `StrainDetailView`'s toolbar — not as a
/// card overlay — so no tap-propagation tricks are needed.
struct CompareToggleButton: View {
    let isInSelection: Bool
    let atCap: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: atCap && !isInSelection ? "arrow.left.arrow.right.slash" : (isInSelection ? "arrow.left.arrow.right.circle.fill" : "arrow.left.arrow.right"))
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(tintColor)
                .frame(width: 32, height: 32)
                .background(Palette.card, in: Circle())
                .overlay(
                    Circle().strokeBorder(borderColor, lineWidth: 1)
                )
                .symbolEffect(.bounce, value: isInSelection)
        }
        .buttonStyle(.plain)
        .disabled(atCap && !isInSelection)
        .accessibilityLabel(accessibilityLabel)
        .accessibilityHint(accessibilityHint)
    }

    private var tintColor: Color {
        if isInSelection { return Palette.primary }
        return Palette.mutedForeground
    }

    private var borderColor: Color {
        if isInSelection { return Palette.primary.opacity(0.4) }
        return Palette.border
    }

    private var accessibilityLabel: String {
        if atCap && !isInSelection { return "Compare is full" }
        return isInSelection ? "Remove from compare" : "Add to compare"
    }

    private var accessibilityHint: String {
        if atCap && !isInSelection { return "Compare is full at 3 strains. Remove one before adding another." }
        return isInSelection
            ? "Removes this strain from the comparison tray."
            : "Adds this strain to the comparison tray."
    }
}
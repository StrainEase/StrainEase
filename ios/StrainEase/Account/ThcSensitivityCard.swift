import SwiftUI

/// Account-settings card for picking the patient's THC sensitivity.
/// Mirrors the closed enum the Kaya prompts and the web app already
/// understand. The unset state (`.typical`) writes a null to Firestore
/// so the backend omits the sensitivity line on the next describe call.
struct ThcSensitivityCard: View {
    @Environment(ThcSensitivityStore.self) private var store

    var body: some View {
        SWCard {
            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    SectionLabel("THC sensitivity")
                    Text("Calibrates the strain descriptions and recommendations Kaya writes for you. Pick the closest match, or leave it off for the default read.")
                        .font(.system(size: 13))
                        .foregroundStyle(Palette.mutedForeground)
                        .fixedSize(horizontal: false, vertical: true)
                }
                VStack(spacing: 8) {
                    ForEach(ThcSensitivity.allCases) { option in
                        ThcSensitivityRow(
                            option: option,
                            isSelected: store.value == option,
                            disabled: store.isBusy
                        ) {
                            Task { await store.save(option) }
                        }
                    }
                }
            }
        }
    }
}

private struct ThcSensitivityRow: View {
    let option: ThcSensitivity
    let isSelected: Bool
    let disabled: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: isSelected ? "largecircle.fill.circle" : "circle")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(isSelected ? Palette.primary : Palette.mutedForeground)
                    .padding(.top, 1)
                VStack(alignment: .leading, spacing: 2) {
                    Text(option.label)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(isSelected ? Palette.primary : Palette.foreground)
                    if option == .typical {
                        Text("No sensitivity line. Use the default read.")
                            .font(.system(size: 12))
                            .foregroundStyle(Palette.mutedForeground)
                    } else if let hint = option.hint {
                        Text(hint)
                            .font(.system(size: 12))
                            .foregroundStyle(Palette.mutedForeground)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(isSelected ? Palette.accent.opacity(0.55) : Palette.muted.opacity(0.35))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(
                        isSelected ? Palette.primary.opacity(0.45) : Palette.border,
                        lineWidth: 1
                    )
            )
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .accessibilityLabel(option.label)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }
}

#Preview("Anxious") {
    ThcSensitivityCard()
        .padding()
        .environment(ThcSensitivityStore.preview(.anxiousHighThc))
}

#Preview("Typical") {
    ThcSensitivityCard()
        .padding()
        .environment(ThcSensitivityStore.preview(.typical))
}

import SwiftUI

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, origin) in result.origins.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + origin.x, y: bounds.minY + origin.y),
                proposal: .unspecified
            )
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, origins: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var origins: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var widthUsed: CGFloat = 0

        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if x > 0, x + size.width > maxWidth {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            origins.append(CGPoint(x: x, y: y))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
            widthUsed = max(widthUsed, x - spacing)
        }
        return (CGSize(width: widthUsed, height: y + rowHeight), origins)
    }
}

struct SectionLabel: View {
    let index: Int?
    let title: String

    init(_ title: String, index: Int? = nil) {
        self.title = title
        self.index = index
    }

    var body: some View {
        HStack(spacing: 6) {
            if let index {
                Text(String(format: "%02d", index))
                    .foregroundStyle(Palette.primary.opacity(0.7))
            }
            Text(title.uppercased())
        }
        .font(.system(size: 11, weight: .semibold, design: .default))
        .tracking(1.4)
        .foregroundStyle(Palette.mutedForeground)
    }
}

struct SWChip: View {
    let title: String
    var isOn: Bool
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 13, weight: .medium))
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .foregroundStyle(isOn ? Palette.primaryForeground : Palette.mutedForeground)
                .background(isOn ? Palette.primary : Palette.card.opacity(0.55), in: Capsule())
                .overlay(
                    Capsule()
                        .strokeBorder(isOn ? Palette.primary : Palette.border, lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.selection, trigger: isOn)
    }
}

/// Outer hairline tray + inner surface. Borders only — no drop shadows.
struct SWCard<Content: View>: View {
    var emphasized = false
    @ViewBuilder var content: () -> Content

    var body: some View {
        content()
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.card, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .strokeBorder(
                        emphasized ? Palette.primary.opacity(0.45) : Palette.border,
                        lineWidth: emphasized ? 1.2 : 1
                    )
            )
            .padding(5)
            .background(
                Palette.muted.opacity(0.45),
                in: RoundedRectangle(cornerRadius: 26, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 26, style: .continuous)
                    .strokeBorder(Palette.border.opacity(0.7), lineWidth: 1)
            )
    }
}

struct SWPrimaryButton: View {
    let title: String
    var systemImage: String = "arrow.right"
    var isBusy = false
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                if isBusy {
                    ProgressView()
                        .tint(Palette.primaryForeground)
                } else {
                    Text(title)
                        .font(.system(size: 16, weight: .semibold))
                }
                Spacer(minLength: 0)
                Image(systemName: systemImage)
                    .font(.system(size: 13, weight: .semibold))
                    .frame(width: 32, height: 32)
                    .background(Palette.primaryForeground.opacity(0.16), in: Circle())
            }
            .foregroundStyle(Palette.primaryForeground)
            .padding(.leading, 22)
            .padding(.trailing, 8)
            .padding(.vertical, 8)
            .background(
                LinearGradient(
                    colors: [Palette.primary, Palette.primary.opacity(0.82)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                in: Capsule()
            )
        }
        .buttonStyle(.plain)
        .disabled(isBusy)
        .opacity(isBusy ? 0.85 : 1)
    }
}

struct SWField: View {
    var title: String?
    var placeholder: String
    @Binding var text: String
    var axis: Axis = .horizontal

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let title {
                Text(title)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Palette.mutedForeground)
            }
            Group {
                if axis == .vertical {
                    TextField(placeholder, text: $text, axis: .vertical)
                        .lineLimit(2...4)
                } else {
                    TextField(placeholder, text: $text)
                }
            }
            .textInputAutocapitalization(.sentences)
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(Palette.card, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(Palette.border, lineWidth: 1)
            )
        }
    }
}

struct IntensityBar: View {
    let value: Int

    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<5, id: \.self) { index in
                Capsule()
                    .fill(index < value ? Palette.primary.opacity(0.85) : Palette.border)
                    .frame(width: 10, height: 6)
            }
        }
        .accessibilityHidden(true)
    }
}

struct TypeBadge: View {
    let type: StrainType?

    var body: some View {
        Text(TypeStyle.label(for: type))
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(TypeStyle.color(for: type))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(TypeStyle.color(for: type).opacity(0.12), in: Capsule())
            .overlay(Capsule().strokeBorder(TypeStyle.color(for: type).opacity(0.25), lineWidth: 1))
    }
}

/// Inline error banner. Same surface style as the original
/// `errorBanner` helper that used to live inside `FindView`, promoted
/// to a shared component so the floating `CompareTrayBar` and the
/// inline Find compare tray can both surface their `compareError`
/// instead of firing only an invisible error haptic.
struct SWErrorBanner: View {
    let message: String

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Palette.destructive)
            Text(message)
                .font(.system(size: 14))
                .foregroundStyle(Palette.foreground)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.destructive.opacity(0.08), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(Palette.destructive.opacity(0.25), lineWidth: 1)
        )
    }
}

struct Eyebrow: View {
    let text: String

    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 11, weight: .semibold))
            .tracking(2.0)
            .foregroundStyle(Palette.primary)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(Palette.accent.opacity(0.7), in: Capsule())
            .overlay(Capsule().strokeBorder(Palette.primary.opacity(0.18), lineWidth: 1))
    }
}

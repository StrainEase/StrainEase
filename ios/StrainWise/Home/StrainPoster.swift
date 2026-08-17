import SwiftUI

struct StrainPoster: View {
    let profile: StrainProfile
    var compact = false
    var photoHeight: CGFloat? = nil

    /// Manual override for previews / tests. When `nil` the poster reads
    /// from the shared `SavedStrainsStore` so the pencil badge lights up
    /// automatically on Home rails, the Directory, and the Saved grid.
    var noteCountOverride: Int? = nil

    @Environment(SavedStrainsStore.self) private var saved

    private var noteCount: Int {
        noteCountOverride ?? saved.notes(for: profile.slug).count
    }

    var body: some View {
        VStack(alignment: .leading, spacing: compact ? 6 : 8) {
            StrainPhoto(
                urlString: profile.imageUrl,
                type: profile.type,
                height: photoHeight ?? (compact ? 108 : 132),
                cornerRadius: 16
            )
            TypeBadge(type: profile.type)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(profile.name)
                    .font(.system(size: compact ? 13 : 15, weight: .semibold, design: .serif))
                    .foregroundStyle(Palette.foreground)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                if noteCount > 0 {
                    HStack(spacing: 3) {
                        Image(systemName: "square.and.pencil")
                            .font(.system(size: compact ? 10 : 12, weight: .semibold))
                        if noteCount > 1 {
                            Text("\(noteCount)")
                                .font(.system(size: compact ? 10 : 11, weight: .semibold, design: .rounded))
                        }
                    }
                    .foregroundStyle(Palette.primary)
                    .padding(.horizontal, compact ? 5 : 6)
                    .padding(.vertical, compact ? 2 : 3)
                    .background(Palette.accent.opacity(0.85), in: Capsule())
                    .overlay(
                        Capsule().strokeBorder(Palette.primary.opacity(0.35), lineWidth: 0.5)
                    )
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel(NoteBadge.accessibilityLabel(for: profile, count: noteCount))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(minHeight: compact ? 32 : 38, alignment: .top)
            if let thc = profile.thcRange, !thc.isEmpty {
                Text("THC \(thc)")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Palette.mutedForeground)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityName)
        .accessibilityHint(profile.subtitle)
    }

    private var accessibilityName: String {
        NoteBadge.accessibilityLabel(for: profile, count: noteCount)
    }
}

struct StrainPhoto: View {
    let urlString: String?
    var type: StrainType?
    var height: CGFloat = 88
    var cornerRadius: CGFloat = 16

    var body: some View {
        StrainPhotoBody(
            urlString: urlString,
            type: type,
            height: height,
            cornerRadius: cornerRadius
        )
        .id(urlString ?? "")
    }
}

private struct StrainPhotoBody: View {
    let urlString: String?
    var type: StrainType?
    var height: CGFloat = 88
    var cornerRadius: CGFloat = 16

    @State private var isLoaded = false

    private var hasPhoto: Bool { urlString?.isEmpty == false }

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .fill(hasPhoto ? Color.white : TypeStyle.color(for: type).opacity(0.14))
            if let urlString, let url = URL(string: urlString) {
                if !isLoaded {
                    loadingPlaceholder
                }
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFit()
                            .padding(height > 160 ? 8 : 4)
                            .opacity(isLoaded ? 1 : 0)
                            .onAppear {
                                withAnimation(.easeInOut(duration: 0.3)) {
                                    isLoaded = true
                                }
                            }
                    case .failure:
                        leaf
                    case .empty:
                        Color.clear
                    @unknown default:
                        leaf
                    }
                }
            } else {
                leaf
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: height)
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .strokeBorder(Palette.border, lineWidth: 1)
        )
        .accessibilityHidden(true)
    }

    private var loadingPlaceholder: some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .fill(Palette.muted)
            .overlay {
                ProgressView()
                    .tint(Palette.mutedForeground)
                    .controlSize(height > 120 ? .regular : .mini)
            }
            .accessibilityLabel("Loading photo")
    }

    private var leaf: some View {
        Image(systemName: "leaf.fill")
            .font(.system(size: height > 120 ? 32 : 24, weight: .semibold))
            .foregroundStyle(TypeStyle.color(for: type).opacity(0.7))
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct StrainRail: View {
    let title: String
    let strains: [StrainProfile]
    var emptyText: String?
    var onSeeMore: () -> Void
    var onSelect: (StrainProfile) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            StrainSectionHeader(title: title, onSeeMore: strains.isEmpty ? nil : onSeeMore)
            if strains.isEmpty {
                Text(emptyText ?? "Nothing here yet.")
                    .font(.system(size: 14))
                    .foregroundStyle(Palette.mutedForeground)
                    .padding(.vertical, 8)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(alignment: .top, spacing: 12) {
                        ForEach(strains) { profile in
                            Button {
                                onSelect(profile)
                            } label: {
                                StrainPoster(profile: profile)
                                    .frame(width: 148, alignment: .leading)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.horizontal, -20)
            }
        }
    }
}

struct StrainSectionHeader: View {
    let title: String
    var onSeeMore: (() -> Void)?

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .font(.system(.title3, design: .serif))
                .foregroundStyle(Palette.foreground)
            Spacer(minLength: 8)
            if let onSeeMore {
                Button("See more", action: onSeeMore)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Palette.primary)
                    .accessibilityHint("Opens the full \(title) list")
            }
        }
    }
}

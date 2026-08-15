import SwiftUI

struct AilmentCarousel: View {
    let ailments: [String]
    let preview: (String) -> [StrainProfile]
    var onSeeMore: (String) -> Void
    var onSelect: (StrainProfile) -> Void

    @State private var pageID: String?
    @State private var pageWidth: CGFloat = 0

    private var currentName: String {
        pageID ?? ailments.first ?? "Symptoms"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            StrainSectionHeader(title: "For your symptoms") {
                onSeeMore(currentName)
            }
            VStack(spacing: 8) {
                ScrollView(.horizontal) {
                    HStack(spacing: 0) {
                        ForEach(ailments, id: \.self) { name in
                            AilmentPage(
                                name: name,
                                strains: Array(preview(name).prefix(6)),
                                onSeeMore: { onSeeMore(name) },
                                onSelect: onSelect
                            )
                            .frame(width: pageWidth > 0 ? pageWidth : nil, alignment: .topLeading)
                            .id(name)
                        }
                    }
                    .scrollTargetLayout()
                }
                .scrollTargetBehavior(.paging)
                .scrollPosition(id: $pageID)
                .scrollIndicators(.hidden)
                .frame(height: 412)
                .onGeometryChange(for: CGFloat.self) { proxy in
                    proxy.size.width
                } action: { pageWidth = $0 }
                .background(Palette.card, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                        .strokeBorder(Palette.border, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))

                pageDots
            }
        }
        .onAppear {
            if pageID == nil { pageID = ailments.first }
        }
    }

    private var pageDots: some View {
        HStack(spacing: 7) {
            ForEach(ailments, id: \.self) { name in
                Button {
                    withAnimation(.easeInOut(duration: 0.25)) { pageID = name }
                } label: {
                    Circle()
                        .fill(name == currentName ? Palette.foreground : Palette.mutedForeground.opacity(0.38))
                        .frame(width: 7, height: 7)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(name)
                .accessibilityAddTraits(name == currentName ? .isSelected : [])
            }
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Symptom pages")
    }
}

private struct AilmentPage: View {
    let name: String
    let strains: [StrainProfile]
    var onSeeMore: () -> Void
    var onSelect: (StrainProfile) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text(name)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Palette.primary)
                Spacer(minLength: 8)
                Button("See more", action: onSeeMore)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.primary)
            }
            strainRow(Array(strains.prefix(3)))
            strainRow(Array(strains.dropFirst(3).prefix(3)))
        }
        .padding(.horizontal, 14)
        .padding(.top, 14)
        .padding(.bottom, 12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func strainRow(_ items: [StrainProfile]) -> some View {
        HStack(alignment: .top, spacing: 12) {
            ForEach(items) { profile in
                Button {
                    onSelect(profile)
                } label: {
                    StrainPoster(profile: profile, compact: true, photoHeight: 72)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(.plain)
            }
        }
    }
}

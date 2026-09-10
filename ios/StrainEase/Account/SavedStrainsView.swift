import SwiftUI

struct SavedStrainsView: View {
    @Environment(SavedStrainsStore.self) private var saved
    @Environment(\.dismiss) private var dismiss
    var showsClose = false

    @State private var pageID: String?
    @State private var pageWidth: CGFloat = 0

    private static let pageSize = 6
    private static let cellSpacing: CGFloat = 10
    private static let pagePadding: CGFloat = 14
    private static let carouselHeight: CGFloat = 530

    private let columns = [
        GridItem(.flexible(), spacing: Self.cellSpacing),
        GridItem(.flexible(), spacing: Self.cellSpacing),
    ]

    /// Saved strains chunked into pages of 6 (2 cols x 3 rows) so
    /// each page is a clean 2x3 grid. Mirrors the Android
    /// `SavedStrainsSheet` paging and the AilmentCarousel UX.
    private var pages: [[SavedStrainItem]] {
        stride(from: 0, to: saved.items.count, by: Self.pageSize).map { start in
            let end = Swift.min(start + Self.pageSize, saved.items.count)
            return Array(saved.items[start..<end])
        }
    }

    private var currentPageIndex: Int {
        guard let pageID, let idx = Int(pageID), idx < pages.count else { return 0 }
        return idx
    }

    var body: some View {
        ZStack {
            MeshBackground()
            if saved.items.isEmpty {
                ContentUnavailableView(
                    "No saved strains",
                    systemImage: "heart",
                    description: Text("Tap the heart on a strain page to keep it here.")
                )
            } else {
                VStack(spacing: 12) {
                    carousel
                    if pages.count > 1 {
                        pageDots
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 32)
            }
        }
        .navigationTitle("Favorites")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
        .toolbar {
            if showsClose {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") { dismiss() }
                }
            }
        }
        .navigationDestination(for: StrainProfile.self) { profile in
            StrainDetailView(profile: profile)
        }
        .accessibilityIdentifier("saved.root")
        .onAppear {
            if pageID == nil { pageID = "0" }
        }
    }

    private var carousel: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 0) {
                ForEach(pages.indices, id: \.self) { idx in
                    pageView(idx: idx)
                        .frame(width: pageWidth > 0 ? pageWidth : nil, alignment: .topLeading)
                        .id(String(idx))
                }
            }
            .scrollTargetLayout()
        }
        .scrollTargetBehavior(.paging)
        .scrollPosition(id: $pageID)
        .scrollIndicators(.hidden)
        .frame(height: Self.carouselHeight)
        .background(Palette.card, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .strokeBorder(Palette.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .onGeometryChange(for: CGFloat.self) { proxy in
            proxy.size.width
        } action: { pageWidth = $0 }
    }

    @ViewBuilder
    private func pageView(idx: Int) -> some View {
        let page = pages[idx]
        LazyVGrid(columns: columns, spacing: Self.cellSpacing) {
            ForEach(page) { item in
                cell(item)
            }
            // Pad partial pages (last page with <6 items) so the
            // grid still reads as a 2x3 layout and the empty slots
            // don't collapse the existing posters to full width.
            ForEach(0..<(Self.pageSize - page.count), id: \.self) { _ in
                Color.clear
                    .frame(maxWidth: .infinity)
                    .frame(height: 1)
                    .accessibilityHidden(true)
            }
        }
        .padding(Self.pagePadding)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func cell(_ item: SavedStrainItem) -> some View {
        ZStack(alignment: .topTrailing) {
            NavigationLink(value: item.profile) {
                StrainPoster(profile: item.profile, compact: true, photoHeight: 90)
                    .compareHoldable(item.profile.name)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(.plain)

            Button {
                Task { await saved.toggle(item.profile) }
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(Palette.mutedForeground)
                    .frame(width: 22, height: 22)
                    .background(Palette.card.opacity(0.95), in: Circle())
                    .overlay(Circle().strokeBorder(Palette.border, lineWidth: 1))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Remove \(item.profile.name)")
            .padding(6)
        }
    }

    private var pageDots: some View {
        HStack(spacing: 7) {
            ForEach(pages.indices, id: \.self) { idx in
                Button {
                    withAnimation(.easeInOut(duration: 0.25)) { pageID = String(idx) }
                } label: {
                    Circle()
                        .fill(
                            idx == currentPageIndex
                                ? Palette.foreground
                                : Palette.mutedForeground.opacity(0.38)
                        )
                        .frame(width: 7, height: 7)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Page \(idx + 1) of \(pages.count)")
                .accessibilityAddTraits(idx == currentPageIndex ? .isSelected : [])
            }
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Saved strain pages")
    }
}

#Preview("Saved") {
    NavigationStack {
        SavedStrainsView()
    }
    .environment(\.strainAPI, PreviewStrainAPI())
    .environment(SavedStrainsStore.preview(["granddaddy-purple", "blue-dream"]))
    .environment(CompareSelectionStore())
}

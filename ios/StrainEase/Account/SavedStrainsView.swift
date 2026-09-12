import SwiftUI

struct SavedStrainsView: View {
    @Environment(SavedStrainsStore.self) private var saved
    @Environment(\.dismiss) private var dismiss
    var showsClose = false

    private static let cellSpacing: CGFloat = 10

    private let columns = [
        GridItem(.flexible(), spacing: Self.cellSpacing),
        GridItem(.flexible(), spacing: Self.cellSpacing),
    ]

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
                ScrollView {
                    LazyVGrid(columns: columns, spacing: Self.cellSpacing) {
                        ForEach(saved.items) { item in
                            cell(item)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 32)
                }
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
}

#Preview("Saved") {
    NavigationStack {
        SavedStrainsView()
    }
    .environment(\.strainAPI, PreviewStrainAPI())
    .environment(SavedStrainsStore.preview(["granddaddy-purple", "blue-dream", "ak-47", "sour-diesel", "og-kush", "gorilla-glue"]))
    .environment(CompareSelectionStore())
}

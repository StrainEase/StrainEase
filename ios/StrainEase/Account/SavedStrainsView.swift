import SwiftUI

struct SavedStrainsView: View {
    @Environment(SavedStrainsStore.self) private var saved
    @Environment(\.dismiss) private var dismiss
    var showsClose = false

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
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
                    LazyVGrid(columns: columns, spacing: 16) {
                        ForEach(saved.items) { item in
                            ZStack(alignment: .topTrailing) {
                                NavigationLink(value: item.profile) {
                                    StrainPoster(profile: item.profile)
                                        .compareHoldable(item.profile.name)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                }
                                .buttonStyle(.plain)
                                // Trash can remove button. Sits above the
                                // NavigationLink so a tap fires the remove
                                // instead of pushing the detail view. Mirrors
                                // the Android SavedStrainsList X → trash
                                // upgrade: red destructive tint in a small
                                // circular white background with a subtle
                                // border so it reads as a chip floating over
                                // the card.
                                SavedStrainTrashButton(name: item.profile.name) {
                                    Task { await saved.toggle(item.profile) }
                                }
                                .padding(6)
                            }
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
}

#Preview("Saved") {
    NavigationStack {
        SavedStrainsView()
    }
    .environment(\.strainAPI, PreviewStrainAPI())
    .environment(SavedStrainsStore.preview(["granddaddy-purple", "blue-dream"]))
    .environment(CompareSelectionStore())
}

/// Small circular trash-can chip pinned to the top-right of a saved
/// strain card. Mirrors the Android `SavedStrainsList` trash upgrade:
/// destructive red tint in a 24pt circular white background with a
/// subtle border so the button reads as a floating chip over the
/// card without competing with the type badge or the strain name.
private struct SavedStrainTrashButton: View {
    let name: String
    let onRemove: () -> Void

    var body: some View {
        Button(action: onRemove) {
            Image(systemName: "trash")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Palette.destructive)
                .frame(width: 28, height: 28)
                .background(Palette.card, in: Circle())
                .overlay(
                    Circle().strokeBorder(Palette.border, lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Remove \(name) from saved")
    }
}

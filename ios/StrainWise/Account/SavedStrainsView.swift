import SwiftUI

struct SavedStrainsView: View {
    @Environment(SavedStrainsStore.self) private var saved

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
                            NavigationLink(value: item.profile) {
                                StrainPoster(profile: item.profile)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 32)
                }
            }
        }
        .navigationTitle("Saved")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
        .navigationDestination(for: StrainProfile.self) { profile in
            StrainDetailView(profile: profile)
        }
    }
}

#Preview("Saved") {
    NavigationStack {
        SavedStrainsView()
    }
    .environment(\.strainAPI, PreviewStrainAPI())
    .environment(SavedStrainsStore.preview(["granddaddy-purple", "blue-dream"]))
}

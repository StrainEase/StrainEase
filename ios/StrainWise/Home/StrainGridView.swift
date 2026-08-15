import SwiftUI

struct StrainGridView: View {
    let title: String
    let strains: [StrainProfile]
    var onSelect: (StrainProfile) -> Void

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    var body: some View {
        ZStack {
            MeshBackground()
            ScrollView {
                if strains.isEmpty {
                    ContentUnavailableView(
                        "No strains yet",
                        systemImage: "leaf",
                        description: Text("Check back after you browse a little more.")
                    )
                    .padding(.top, 80)
                } else {
                    LazyVGrid(columns: columns, spacing: 16) {
                        ForEach(strains) { profile in
                            Button {
                                onSelect(profile)
                            } label: {
                                StrainPoster(profile: profile)
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
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
    }
}

import SwiftUI

struct ResearchHistoryView: View {
    @Environment(ResearchHistoryStore.self) private var history
    @Environment(AppNavigation.self) private var nav
    @State private var loadingId: String?
    @State private var loadError: String?

    var body: some View {
        ZStack {
            MeshBackground()
            if history.entries.isEmpty {
                ContentUnavailableView(
                    "No past searches yet",
                    systemImage: "clock",
                    description: Text("After you find or compare strains, they land here so you can reopen the exact result.")
                )
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        if let loadError {
                            Text(loadError)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(Palette.destructive)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        ForEach(history.entries) { entry in
                            Button {
                                Task { await open(entry) }
                            } label: {
                                SWCard {
                                    HStack(alignment: .top, spacing: 12) {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(entry.title)
                                                .font(.system(size: 15, weight: .semibold))
                                                .foregroundStyle(Palette.foreground)
                                                .multilineTextAlignment(.leading)
                                                .fixedSize(horizontal: false, vertical: true)
                                            Text("\(entry.kind == .compare ? "Comparison" : "Find") · \(formatted(entry.createdAt))")
                                                .font(.system(size: 12))
                                                .foregroundStyle(Palette.mutedForeground)
                                        }
                                        Spacer(minLength: 8)
                                        if loadingId == entry.id {
                                            ProgressView()
                                        } else {
                                            Image(systemName: "clock")
                                                .font(.system(size: 13, weight: .semibold))
                                                .foregroundStyle(Palette.mutedForeground)
                                        }
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                            .disabled(loadingId != nil)
                            .accessibilityLabel("\(entry.title), \(entry.kind == .compare ? "comparison" : "find")")
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 32)
                }
            }
        }
        .navigationTitle("Past research")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
    }

    private func open(_ entry: HistoryEntry) async {
        loadError = nil
        loadingId = entry.id
        defer { loadingId = nil }
        if let restored = await history.loadResearch(id: entry.id) {
            nav.openResearch(restored)
        } else {
            loadError = "Couldn’t reopen that result. It may have expired."
        }
    }

    private func formatted(_ createdAt: Int) -> String {
        Date(timeIntervalSince1970: TimeInterval(createdAt) / 1000)
            .formatted(date: .abbreviated, time: .shortened)
    }
}

#Preview("History") {
    NavigationStack {
        ResearchHistoryView()
    }
    .environment(AppNavigation())
    .environment(
        ResearchHistoryStore.preview([
            HistoryEntry(
                id: "a",
                kind: .find,
                title: "Best strains for Insomnia",
                createdAt: 1_700_000_000_000
            ),
            HistoryEntry(
                id: "b",
                kind: .compare,
                title: "Blue Dream vs. Granddaddy Purple",
                createdAt: 1_699_000_000_000
            ),
        ])
    )
}

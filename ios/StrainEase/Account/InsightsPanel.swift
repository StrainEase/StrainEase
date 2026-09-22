import SwiftUI

/// Mirrors `src/components/saved/JournalPanel.tsx` (PR-W1).
///
/// Web puts the Insights entry as a top-header circular button between
/// Favorites and Library. iOS doesn't have a top-of-screen header in
/// the same spot; the same surface lives as a card on the Account
/// screen, auth-gated via the surrounding `AccountView`.
struct InsightsPanel: View {
    @Environment(ReliefLogStore.self) private var logs
    @Environment(SavedStrainsStore.self) private var saved
    @Environment(SavedAilmentsStore.self) private var ailments
    @Environment(\.dismiss) private var dismiss
    @State private var showHistory = false

    /// PR-W1 parity: ≥3 logs per strain for a chip to appear.
    private let minLogs = 3

    var body: some View {
        NavigationStack {
            ZStack {
                MeshBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        header
                        if !logs.logs.isEmpty {
                            perStrainList
                            Button {
                                showHistory = true
                            } label: {
                                HStack {
                                    Text("View all \(logs.logs.count) sessions")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(Palette.primary)
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundStyle(Palette.primary)
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 12)
                                .background(Palette.primary.opacity(0.08), in: RoundedRectangle(cornerRadius: 14))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .strokeBorder(Palette.primary.opacity(0.25), lineWidth: 1)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 32)
                }
            }
            .navigationTitle("Insights")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.hidden, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(Palette.primary)
                }
            }
            .sheet(isPresented: $showHistory) {
                NavigationStack {
                    ReliefHistoryView()
                        .toolbar {
                            ToolbarItem(placement: .topBarTrailing) {
                                Button("Done") { showHistory = false }
                                    .foregroundStyle(Palette.primary)
                            }
                        }
                }
            }
        }
    }

    @ViewBuilder
    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Personal insights")
                .font(.system(.title2, design: .serif))
                .foregroundStyle(Palette.foreground)
            if logs.logs.isEmpty {
                Text("Log a strain after you try it and we'll surface what's working for you.")
                    .font(.system(size: 14))
                    .foregroundStyle(Palette.mutedForeground)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                Text("Based on \(logs.logs.count) session\(logs.logs.count == 1 ? "" : "s") across your saved strains.")
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.mutedForeground)
            }
        }
    }

    @ViewBuilder
    private var perStrainList: some View {
        let cards = perStrainCards
        if cards.isEmpty {
            SWCard {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Not enough data yet")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Palette.foreground)
                    Text("Log this strain at least 3 times to see a personal hit-rate chip.")
                        .font(.system(size: 13))
                        .foregroundStyle(Palette.mutedForeground)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        } else {
            VStack(alignment: .leading, spacing: 12) {
                SectionLabel("What's working")
                ForEach(cards, id: \.strain) { card in
                    StrainPersonalInsight(
                        logs: card.logs,
                        savedConditions: ailments.ailments
                    )
                    .padding(.horizontal, 4)
                }
            }
        }
    }

    /// Build per-strain card data — one insight rollup per saved strain.
    private var perStrainCards: [PerStrainCard] {
        let strainNames = saved.items.isEmpty
            // No saved strains yet — surface insights across anything
            // logged. Otherwise gate to the saved set.
            ? Set(logs.logs.map { $0.strainName })
            : Set(saved.items.map { $0.name })
        return strainNames.compactMap { name in
            let strainLogs = logs.logs(for: name)
            guard strainLogs.count >= minLogs else { return nil }
            return PerStrainCard(strain: name, logs: strainLogs)
        }
        .sorted { $0.strain < $1.strain }
    }

    private struct PerStrainCard {
        let strain: String
        let logs: [ReliefLog]
    }
}

#Preview("Insights panel") {
    InsightsPanel()
        .environment(ReliefLogStore.preview([.sampleSleep, .sampleSleep, .sampleSleep, .sampleSleep]))
        .environment(SavedStrainsStore.preview([]))
        .environment(SavedAilmentsStore.preview(["Insomnia"]))
}

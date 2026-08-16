import SwiftUI

/// Reusable rendering of a `StrainComparison`. Used inline on the Find tab
/// (FindView observes the shared store) and inside the tray's result sheet
/// (which owns its own `NavigationStack` so a strain detail drill-down works
/// from either surface).
struct CompareResultsView: View {
    let comparison: StrainComparison
    let onSelectProfile: (StrainProfile) -> Void

    private var analysis: StrainAnalysis { comparison.analysis }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                SectionLabel("Comparison")
                Text(analysis.headline)
                    .font(.system(.title, design: .serif))
                    .foregroundStyle(Palette.foreground)
                    .fixedSize(horizontal: false, vertical: true)
                Text(analysis.summary)
                    .font(.system(size: 15))
                    .foregroundStyle(Palette.mutedForeground)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if let pick = analysis.forCondition {
                SWCard {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Best for your symptoms")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Palette.primary)
                        Text(pick.best)
                            .font(.system(.title3, design: .serif))
                        Text(pick.why)
                            .font(.system(size: 14))
                            .foregroundStyle(Palette.mutedForeground)
                        if !pick.runnerUp.isEmpty {
                            Text("Runner-up: \(pick.runnerUp)")
                                .font(.system(size: 13))
                                .foregroundStyle(Palette.mutedForeground)
                        }
                    }
                }
            }
            bulletList("Key differences", analysis.keyDifferences)
            bulletList("Common ground", analysis.commonGround)
            bulletList("Cautions", analysis.cautions)
            ForEach(comparison.strains) { profile in
                Button {
                    onSelectProfile(profile)
                } label: {
                    SWCard {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(profile.name)
                                    .font(.system(.title3, design: .serif))
                                    .foregroundStyle(Palette.foreground)
                                if !profile.subtitle.isEmpty {
                                    Text(profile.subtitle)
                                        .font(.system(size: 13))
                                        .foregroundStyle(Palette.mutedForeground)
                                }
                            }
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .foregroundStyle(Palette.mutedForeground)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
        }
    }

    @ViewBuilder
    private func bulletList(_ title: String, _ items: [String]) -> some View {
        if !items.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(title)
                SWCard {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(items, id: \.self) { item in
                            Text(item)
                                .font(.system(size: 14))
                                .foregroundStyle(Palette.foreground)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
            }
        }
    }
}

/// Sheet binding wrapper — `StrainComparison` isn't `Identifiable` and we
/// don't want to widen the model for a UI detail.
struct ComparisonPresentation: Identifiable {
    let comparison: StrainComparison
    var id: String { comparison.resultId ?? comparison.analysis.headline }
}
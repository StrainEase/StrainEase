// "Why this strain" — auditable evidence ledger for a single
// AI recommendation. Direct port of the web `ReasoningTrace.tsx`.
//
// Renders the `reasoning` block the model emits with every pick
// from `recommendStrainsForConditions`. The patient can collapse
// the rest of the card and still see this; if a number or claim
// later feels off, they can audit exactly which input it came
// from without re-running a search.
//
// The component renders nothing when `reasoning` is nil so it is
// safe to mount on every card without DOM noise for older model
// responses.

import SwiftUI

struct ReasoningTraceView: View {
    let reasoning: ReasoningEvidence?
    @State private var isOpen: Bool = false

    var body: some View {
        if let reasoning, !reasoning.isEmpty {
            VStack(alignment: .leading, spacing: 0) {
                Button {
                    withAnimation(.easeInOut(duration: 0.18)) {
                        isOpen.toggle()
                    }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(Palette.primary)
                        Text("Why this strain")
                            .font(.system(size: 11, weight: .semibold))
                            .tracking(1.2)
                            .foregroundStyle(Palette.mutedForeground)
                        Spacer()
                        Text(sourceCount(reasoning))
                            .font(.system(size: 11))
                            .foregroundStyle(Palette.mutedForeground)
                        Image(systemName: "chevron.down")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(Palette.mutedForeground)
                            .rotationEffect(.degrees(isOpen ? 180 : 0))
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Why this strain — show evidence")
                if isOpen {
                    VStack(alignment: .leading, spacing: 12) {
                        if !reasoning.matchedConditions.isEmpty {
                            section(
                                icon: "target",
                                title: "Matched your conditions"
                            ) {
                                bulletList(reasoning.matchedConditions, color: Palette.primary)
                            }
                        }
                        if !reasoning.preferencesApplied.isEmpty {
                            section(
                                icon: "list.bullet.rectangle",
                                title: "Honored your preferences"
                            ) {
                                bulletList(reasoning.preferencesApplied, color: Palette.primary)
                            }
                        }
                        if !reasoning.evidence.isEmpty {
                            section(
                                icon: "list.clipboard",
                                title: "Source-anchored evidence"
                            ) {
                                VStack(alignment: .leading, spacing: 8) {
                                    ForEach(Array(reasoning.evidence.enumerated()), id: \.offset) { _, item in
                                        evidenceRow(item)
                                    }
                                }
                            }
                        }
                        if !reasoning.considerations.isEmpty {
                            section(
                                icon: "exclamationmark.triangle",
                                title: "Weigh before trying",
                                titleColor: .orange
                            ) {
                                VStack(alignment: .leading, spacing: 6) {
                                    ForEach(Array(reasoning.considerations.enumerated()), id: \.offset) { _, c in
                                        HStack(alignment: .top, spacing: 6) {
                                            Image(systemName: "exclamationmark.triangle.fill")
                                                .font(.system(size: 9, weight: .semibold))
                                                .foregroundStyle(.orange)
                                                .padding(.top, 2)
                                            Text(c)
                                                .font(.system(size: 12))
                                                .foregroundStyle(.orange)
                                                .fixedSize(horizontal: false, vertical: true)
                                        }
                                    }
                                }
                            }
                        }
                        HStack(alignment: .top, spacing: 6) {
                            Image(systemName: "clock.arrow.circlepath")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundStyle(Palette.mutedForeground)
                            Text("Evidence was drawn from the same inputs the model was given (Leafly/Weedmaps/Allbud profiles, community notes, the curated Reddit seed, and your own relief log). No facts are invented.")
                                .font(.system(size: 10))
                                .foregroundStyle(Palette.mutedForeground)
                                .fixedSize(horizontal: false, vertical: true)
                            if !reasoning.evidence.isEmpty {
                                Image(systemName: "checkmark.seal.fill")
                                    .font(.system(size: 10))
                                    .foregroundStyle(.green)
                            }
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.bottom, 12)
                    .transition(.opacity)
                }
            }
            .background(Palette.card.opacity(0.5), in: RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(Palette.border, lineWidth: 1)
            )
        }
    }

    private func sourceCount(_ r: ReasoningEvidence) -> String {
        let n = r.evidence.count
        return "\(n) \(n == 1 ? "source" : "sources")"
    }

    @ViewBuilder
    private func section<Content: View>(
        icon: String,
        title: String,
        titleColor: Color = Palette.mutedForeground,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 10, weight: .semibold))
                Text(title.uppercased())
                    .font(.system(size: 10, weight: .semibold))
                    .tracking(1.0)
            }
            .foregroundStyle(titleColor)
            content()
        }
    }

    @ViewBuilder
    private func bulletList(_ items: [String], color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                HStack(alignment: .top, spacing: 6) {
                    Text("•")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(color)
                    Text(item)
                        .font(.system(size: 12))
                        .foregroundStyle(Palette.foreground.opacity(0.9))
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }

    private func evidenceRow(_ item: ReasoningEvidenceItem) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Circle()
                .fill(dotColor(for: item.source))
                .frame(width: 6, height: 6)
                .padding(.top, 6)
            VStack(alignment: .leading, spacing: 4) {
                Text(item.source.rawValue)
                    .font(.system(size: 9, weight: .semibold))
                    .tracking(1.0)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(pillBackground(for: item.source), in: Capsule())
                    .foregroundStyle(pillForeground(for: item.source))
                Text(item.quote)
                    .font(.system(size: 12))
                    .foregroundStyle(Palette.foreground.opacity(0.9))
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func dotColor(for source: ReasoningSource) -> Color {
        switch source {
        case .leafly: return .green
        case .weedmaps: return .blue
        case .allbud: return .purple
        case .reddit: return .orange
        case .aggregated: return .gray
        case .patientHistory: return Palette.primary
        }
    }

    private func pillBackground(for source: ReasoningSource) -> Color {
        switch source {
        case .leafly: return Color.green.opacity(0.12)
        case .weedmaps: return Color.blue.opacity(0.12)
        case .allbud: return Color.purple.opacity(0.12)
        case .reddit: return Color.orange.opacity(0.12)
        case .aggregated: return Color.gray.opacity(0.12)
        case .patientHistory: return Palette.primary.opacity(0.12)
        }
    }

    private func pillForeground(for source: ReasoningSource) -> Color {
        switch source {
        case .leafly: return .green
        case .weedmaps: return .blue
        case .allbud: return .purple
        case .reddit: return .orange
        case .aggregated: return .gray
        case .patientHistory: return Palette.primary
        }
    }
}

#Preview("With reasoning") {
    let r = ReasoningEvidence(
        matchedConditions: ["Insomnia", "Anxiety"],
        preferencesApplied: ["Time of day: night", "THC-sensitive (lean toward lower-THC options)"],
        evidence: [
            ReasoningEvidenceItem(source: .leafly, quote: "Reported effects include relaxation and sleep for 78% of reviewers."),
            ReasoningEvidenceItem(source: .patientHistory, quote: "Your last log rated similar strains 4/5 for relief."),
        ],
        considerations: ["Start low given the patient's THC sensitivity."]
    )
    return VStack(alignment: .leading, spacing: 16) {
        ReasoningTraceView(reasoning: r)
    }
    .padding()
}

#Preview("Empty") {
    ReasoningTraceView(reasoning: nil)
        .padding()
}

#Preview("All empty arrays") {
    ReasoningTraceView(reasoning: ReasoningEvidence(
        matchedConditions: [],
        preferencesApplied: [],
        evidence: [],
        considerations: []
    ))
    .padding()
}

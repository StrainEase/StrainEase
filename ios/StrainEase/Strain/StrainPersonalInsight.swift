import SwiftUI

/// Patient-specific "works for X" chip on the strain detail page.
///
/// Mirrors `src/components/saved/StrainPersonalInsight.tsx` from PR-W1:
/// shows once the patient has logged this strain at least 3 times, and
/// calls out the saved-condition match (e.g. "Helpful for insomnia · 3 of
/// 5 sessions hit the mark"). Tries each saved ailment first, falls back
/// to any-condition. Stays silent when there isn't enough data.
struct StrainPersonalInsight: View {
    let logs: [ReliefLog]
    var savedConditions: [String]

    /// 3 logs is the PR-W1 web threshold. Surface only when met.
    private let minLogs = 3

    private var snapshot: Snapshot? {
        guard logs.count >= minLogs else { return nil }
        let helpful = logs.filter { $0.fit == .justRight && $0.relief >= 4 }
        let hits = helpful.count
        let total = logs.count
        let condition = bestCondition(from: helpful)
        guard let condition else { return nil }
        return Snapshot(condition: condition, hits: hits, total: total)
    }

    var body: some View {
        if let snap = snapshot {
            HStack(spacing: 8) {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.primary)
                Text(label(for: snap))
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Palette.foreground)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Palette.primary.opacity(0.08), in: Capsule())
            .overlay(
                Capsule().strokeBorder(Palette.primary.opacity(0.25), lineWidth: 1)
            )
        }
    }

    private func label(for snap: Snapshot) -> String {
        // Same copy shape as PR-W1: "Helpful for X · N of M sessions hit the mark".
        let head = "Helpful for \(snap.condition)"
        let tail = "\(snap.hits) of \(snap.total) sessions hit the mark"
        return "\(head) · \(tail)"
    }

    /// Try saved conditions first, then any condition present in logs.
    private func bestCondition(from helpful: [ReliefLog]) -> String? {
        let candidates = helpful.flatMap { $0.conditions.map { $0.lowercased() } }
        let saved = savedConditions.map { $0.lowercased() }
        if let match = saved.first(where: candidates.contains) {
            return savedConditions.first(where: { $0.lowercased() == match }) ?? match
        }
        return helpful.flatMap { $0.conditions }.first
    }

    private struct Snapshot {
        let condition: String
        let hits: Int
        let total: Int
    }
}

#Preview("Hit-rate chip") {
    let sampleLogs = [
        ReliefLog.sampleSleep,
        ReliefLog.sampleSleep,
        ReliefLog.sampleSleep,
        ReliefLog.sampleSleep,
        ReliefLog.sampleSleep,
    ]
    return StrainPersonalInsight(logs: sampleLogs, savedConditions: ["Insomnia"])
        .padding()
}

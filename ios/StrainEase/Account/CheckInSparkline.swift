// Multi-series sparkline for the daily check-in trend. Four
// colored polylines (mood / sleep / pain / anxiety) over a 14-day
// window, drawn with SwiftUI's `Canvas` (no chart library).
// Mirrors the web `Sparkline.tsx` so the iOS, Android, and web
// clients all show the same shape.
//
// Gaps in the data are drawn as a thin dotted vertical line so
// the patient can tell at a glance "I missed a day" without
// thinking the trend dipped to zero.

import SwiftUI

struct CheckInSparkline: View {
    let points: [CheckInTrendPoint]

    private let size = CGSize(width: 280, height: 64)
    private let padding: CGFloat = 4

    private struct Series {
        var label: String
        var color: Color
        var highIsGood: Bool
        var values: [Int?]
    }

    private var seriesList: [Series] {
        [
            Series(label: "Mood", color: .green, highIsGood: true,
                   values: points.map { $0.mood }),
            Series(label: "Sleep", color: .teal, highIsGood: true,
                   values: points.map { $0.sleep }),
            Series(label: "Pain", color: .red, highIsGood: false,
                   values: points.map { $0.pain }),
            Series(label: "Anxiety", color: .orange, highIsGood: false,
                   values: points.map { $0.anxiety }),
        ]
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Canvas { ctx, _ in
                guard !points.isEmpty else { return }
                let w = size.width
                let h = size.height
                let usableWidth = w - padding * 2
                let usableHeight = h - padding * 2
                let stepX = points.count > 1 ? usableWidth / CGFloat(points.count - 1) : 0

                // Horizontal grid lines at 1, 3, 5 for visual
                // reference. Drawn first so series sit on top.
                for value in [1, 3, 5] {
                    let y = yPos(for: value, in: usableHeight)
                    var path = Path()
                    path.move(to: CGPoint(x: padding, y: padding + y))
                    path.addLine(to: CGPoint(x: padding + usableWidth, y: padding + y))
                    ctx.stroke(path, with: .color(Palette.border.opacity(0.6)), lineWidth: 0.5)
                }

                for series in seriesList {
                    var line = Path()
                    var started = false
                    for (i, value) in series.values.enumerated() {
                        guard let value else { continue }
                        let x = padding + CGFloat(i) * stepX
                        let y = padding + yPos(for: value, in: usableHeight)
                        if !started {
                            line.move(to: CGPoint(x: x, y: y))
                            started = true
                        } else {
                            line.addLine(to: CGPoint(x: x, y: y))
                        }
                    }
                    ctx.stroke(line, with: .color(series.color), style: StrokeStyle(lineWidth: 1.6, lineCap: .round, lineJoin: .round))

                    // Gap markers — a thin vertical dotted line at
                    // any day where the metric was missing.
                    for (i, value) in series.values.enumerated() {
                        guard value == nil else { continue }
                        let x = padding + CGFloat(i) * stepX
                        var gap = Path()
                        gap.move(to: CGPoint(x: x, y: padding))
                        gap.addLine(to: CGPoint(x: x, y: padding + usableHeight))
                        ctx.stroke(gap, with: .color(series.color.opacity(0.25)), style: StrokeStyle(lineWidth: 1, dash: [2, 2]))
                    }
                }
            }
            .frame(width: size.width, height: size.height)
            .frame(maxWidth: .infinity, alignment: .leading)

            HStack(spacing: 12) {
                ForEach(seriesList, id: \.label) { s in
                    HStack(spacing: 4) {
                        Circle()
                            .fill(s.color)
                            .frame(width: 6, height: 6)
                        Text(s.label)
                            .font(.system(size: 10))
                            .foregroundStyle(Palette.mutedForeground)
                    }
                }
            }
        }
    }

    /// Map a 1-5 value to a y position inside the usable area.
    /// High values (5) land at the top.
    private func yPos(for value: Int, in height: CGFloat) -> CGFloat {
        let clamped = max(1, min(5, value))
        let normalized = CGFloat(clamped - 1) / 4.0
        return height * (1.0 - normalized)
    }
}

#Preview("Two weeks") {
    let today = CheckInStore.todayKey()
    let mock: [CheckInTrendPoint] = (0..<14).map { i in
        let parts = today.split(separator: "-").compactMap { Int($0) }
        let cal = Calendar(identifier: .gregorian)
        var comp = DateComponents()
        comp.year = parts[0]
        comp.month = parts[1]
        comp.day = parts[2] - (13 - i)
        comp.timeZone = TimeZone(identifier: "UTC")
        let date = cal.date(from: comp) ?? Date()
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "UTC")
        let key = formatter.string(from: date)
        return CheckInTrendPoint(
            date: key,
            mood: i.isMultiple(of: 2) ? 4 : 3,
            sleep: i % 3 == 0 ? nil : 3,
            pain: i.isMultiple(of: 3) ? 2 : 4,
            anxiety: i.isMultiple(of: 2) ? 3 : 5
        )
    }
    return SWCard {
        VStack(alignment: .leading, spacing: 8) {
            SectionLabel("14-day trend")
            CheckInSparkline(points: mock)
        }
    }
    .padding()
}

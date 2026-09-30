// Daily check-in panel — form on top, 14-day sparkline + averages
// below. Direct port of the web `CheckInPanel.tsx`. Used on the
// Account screen and on a sheet from the strain detail "How are
// you today?" CTA so the same UI works in both entry points.

import SwiftUI

struct CheckInPanel: View {
    @Environment(CheckInStore.self) private var store

    var compact: Bool = false

    private var today: CheckIn? {
        store.checkIn(forKey: CheckInStore.todayKey())
    }

    private var trend: CheckInTrend {
        CheckInStore.buildTrend(from: store.checkIns)
    }

    private var averagesText: String? {
        guard let a = trend.averages else { return nil }
        return String(
            format: "Mood %.1f · Sleep %.1f · Pain %.1f · Anxiety %.1f",
            Double(a.mood), Double(a.sleep), Double(a.pain), Double(a.anxiety)
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            header
            CheckInForm(today: today)
            Divider().overlay(Palette.border)
            if !compact || trend.loggedDays > 0 {
                trendSection
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            SectionLabel("Daily check-in")
            Text("How are you today?")
                .font(.system(.title3, design: .serif))
                .foregroundStyle(Palette.foreground)
            Text("Four 1–5 scores plus an optional note. The 14-day trend below helps Dr. Kaya tailor future recommendations.")
                .font(.system(size: 13))
                .foregroundStyle(Palette.mutedForeground)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    @ViewBuilder
    private var trendSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                SectionLabel("14-day trend")
                Spacer()
                if let averagesText {
                    Text(averagesText)
                        .font(.system(size: 11))
                        .foregroundStyle(Palette.mutedForeground)
                        .multilineTextAlignment(.trailing)
                }
            }
            if trend.loggedDays == 0 {
                Text("No check-ins yet — your trend will appear here after your first log.")
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.mutedForeground)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 16)
            } else {
                CheckInSparkline(points: trend.days)
                Text("Logged \(trend.loggedDays) of \(trend.days.count) days")
                    .font(.system(size: 11))
                    .foregroundStyle(Palette.mutedForeground)
            }
        }
    }
}

#Preview("With data") {
    let today = CheckInStore.todayKey()
    let cal = Calendar(identifier: .gregorian)
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd"
    formatter.timeZone = TimeZone(identifier: "UTC")
    var comps = DateComponents()
    comps.year = Int(today.split(separator: "-")[0]) ?? 2024
    comps.month = Int(today.split(separator: "-")[1]) ?? 1
    comps.day = Int(today.split(separator: "-")[2]) ?? 1
    comps.timeZone = TimeZone(identifier: "UTC")
    let now = Int(Date().timeIntervalSince1970 * 1000)
    let samples: [CheckIn] = (0..<7).map { i in
        let d = cal.date(byAdding: .day, value: -i, to: cal.date(from: comps) ?? Date()) ?? Date()
        let key = formatter.string(from: d)
        return CheckIn(
            id: key,
            date: key,
            metrics: CheckInMetrics(mood: 3 + (i % 3), sleep: 4 - (i % 2), pain: 2, anxiety: 3),
            note: "",
            createdAt: now,
            updatedAt: now
        )
    }
    return SWCard {
        CheckInPanel()
    }
    .padding()
    .environment(CheckInStore.preview(samples))
}

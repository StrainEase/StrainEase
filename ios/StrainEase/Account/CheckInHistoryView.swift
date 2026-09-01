// Full check-in history screen. The form on top (so the patient
// can log today without scrolling) plus the 14-day trend below,
// matching the Account web experience. Mirrors the web
// `CheckInPanel.tsx` shell.

import SwiftUI

struct CheckInHistoryView: View {
    @Environment(CheckInStore.self) private var store

    var body: some View {
        ZStack {
            MeshBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    SWCard {
                        CheckInPanel()
                    }
                    if !store.checkIns.isEmpty {
                        SWCard {
                            VStack(alignment: .leading, spacing: 12) {
                                SectionLabel("Recent check-ins")
                                ForEach(store.checkIns.prefix(14)) { entry in
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(formatDate(entry.date))
                                            .font(.system(size: 14, weight: .semibold))
                                        HStack(spacing: 12) {
                                            metric("Mood", entry.metrics.mood)
                                            metric("Sleep", entry.metrics.sleep)
                                            metric("Pain", entry.metrics.pain)
                                            metric("Anxiety", entry.metrics.anxiety)
                                        }
                                        if !entry.note.isEmpty {
                                            Text(entry.note)
                                                .font(.system(size: 13))
                                                .foregroundStyle(Palette.mutedForeground)
                                                .fixedSize(horizontal: false, vertical: true)
                                        }
                                    }
                                    .padding(.vertical, 6)
                                    if entry.id != store.checkIns.prefix(14).last?.id {
                                        Divider().overlay(Palette.border)
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 32)
            }
        }
        .navigationTitle("Daily check-in")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
    }

    private func metric(_ label: String, _ value: Int) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(label)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(Palette.mutedForeground)
            Text("\(value)/5")
                .font(.system(size: 13, weight: .semibold))
        }
    }

    private func formatDate(_ key: String) -> String {
        let parts = key.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return key }
        var comps = DateComponents()
        comps.year = parts[0]
        comps.month = parts[1]
        comps.day = parts[2]
        comps.timeZone = TimeZone(identifier: "UTC")
        let cal = Calendar(identifier: .gregorian)
        guard let date = cal.date(from: comps) else { return key }
        return date.formatted(date: .abbreviated, time: .omitted)
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
    let samples: [CheckIn] = (0..<5).map { i in
        let d = cal.date(byAdding: .day, value: -i, to: cal.date(from: comps) ?? Date()) ?? Date()
        let key = formatter.string(from: d)
        return CheckIn(
            id: key,
            date: key,
            metrics: CheckInMetrics(mood: 3 + (i % 3), sleep: 4 - (i % 2), pain: 2, anxiety: 3),
            note: i.isMultiple(of: 2) ? "Felt steady through the day." : "",
            createdAt: now,
            updatedAt: now
        )
    }
    return NavigationStack {
        CheckInHistoryView()
    }
    .environment(CheckInStore.preview(samples))
}

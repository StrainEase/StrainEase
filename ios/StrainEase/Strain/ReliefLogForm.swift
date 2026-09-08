import SwiftUI

struct ReliefLogForm: View {
    let strainName: String
    var conditions: [String] = []
    @Environment(ReliefLogStore.self) private var logs
    @State private var fit: ReliefFit = .justRight
    @State private var rating = 0
    @State private var relief = 4
    @State private var note = ""
    @State private var extraCondition = ""

    var body: some View {
        // The logging/experience card is always expanded and uses the
        // standard SWCard chrome — no collapse toggle (matches Android
        // `ReliefLogForm` and web's expanded relief log).
        SWCard {
            VStack(alignment: .leading, spacing: 12) {
                // In-card heading, matching the other section cards'
                // bold heading style.
                // In-card heading, matching the other section cards'
                // bold heading style, with the AI sparkle marker.
                HStack(spacing: 6) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Palette.primary)
                    Text("How'd this work for you?")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Palette.foreground)
                }
                FlowLayout(spacing: 8) {
                    ForEach(ReliefFit.allCases) { option in
                        SWChip(title: option.label, isOn: fit == option) {
                            fit = option
                        }
                    }
                }
                VStack(alignment: .leading, spacing: 6) {
                    Text("Relief \(relief)/5")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Palette.mutedForeground)
                    SegmentedIntensityPicker(value: $relief, label: "Relief")
                }
                TextField("Optional note — e.g. slept 6 hours", text: $note)
                        .textInputAutocapitalization(.sentences)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(Palette.muted.opacity(0.6), in: Capsule())
                    if conditions.isEmpty {
                        TextField("What did you use it for? (e.g. insomnia)", text: $extraCondition)
                            .textInputAutocapitalization(.sentences)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Palette.muted.opacity(0.6), in: Capsule())
                    }
                Button {
                    Task { await save() }
                } label: {
                    Text("Save log")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Palette.primaryForeground)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(Palette.primary, in: Capsule())
                }
                .buttonStyle(.plain)
                .disabled(logs.isBusy)
            }
        }
    }

    private func save() async {
        var merged = conditions
        let extra = extraCondition.trimmingCharacters(in: .whitespacesAndNewlines)
        if !extra.isEmpty { merged.append(extra) }
        await logs.add(
            strainName: strainName,
            conditions: merged,
            fit: fit,
            rating: rating,
            relief: relief,
            note: note
        )
        note = ""
        rating = 0
        extraCondition = ""
    }
}

private struct SegmentedIntensityPicker: View {
    @Binding var value: Int
    let label: String

    var body: some View {
        HStack(spacing: 2) {
            ForEach(1...5, id: \.self) { segment in
                Button {
                    value = segment
                } label: {
                    Circle()
                        .fill(segment <= value ? Palette.primary : Palette.card)
                        .frame(width: 14, height: 14)
                        .overlay(
                            Circle()
                                .strokeBorder(
                                    segment <= value ? Palette.primary : Palette.border,
                                    lineWidth: 1
                                )
                        )
                        .frame(width: 36, height: 36)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(label) \(segment) out of 5")
                .accessibilityAddTraits(segment == value ? .isSelected : [])
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(label), \(value) out of 5")
    }
}

struct ReliefHistoryList: View {
    let logs: [ReliefLog]

    var body: some View {
        if logs.isEmpty {
            EmptyView()
        } else {
            VStack(alignment: .leading, spacing: 10) {
                SectionLabel("Relief history")
                ForEach(logs) { log in
                    SWCard {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                HStack(spacing: 3) {
                                    if log.rating > 0 {
                                        ForEach(0..<log.rating, id: \.self) { _ in
                                            Image(systemName: "star.fill")
                                                .font(.system(size: 10, weight: .semibold))
                                                .foregroundStyle(Palette.primary)
                                        }
                                    }
                                    Text(log.fit.label)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(Palette.foreground)
                                }
                                Spacer()
                                Text("Intensity \(log.relief)/5")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(Palette.mutedForeground)
                            }
                            if !log.conditions.isEmpty {
                                Text("for \(log.conditions.joined(separator: ", "))")
                                    .font(.system(size: 13))
                                    .foregroundStyle(Palette.mutedForeground)
                            }
                            if !log.note.isEmpty {
                                Text(log.note)
                                    .font(.system(size: 14))
                                    .foregroundStyle(Palette.foreground)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            Text(formatted(log.createdAt))
                                .font(.system(size: 11))
                                .foregroundStyle(Palette.mutedForeground)
                        }
                    }
                }
            }
        }
    }

    private func formatted(_ millis: Int) -> String {
        Date(timeIntervalSince1970: TimeInterval(millis) / 1000)
            .formatted(date: .abbreviated, time: .omitted)
    }
}

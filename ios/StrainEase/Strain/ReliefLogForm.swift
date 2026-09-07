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
                    // Rating (stars) and Intensity (relief scale) recorded
                    // separately, two centered columns — mirrors the
                    // Android/web two-column layout.
                    HStack(alignment: .center, spacing: 24) {
                        VStack(spacing: 6) {
                            Text("Rating")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Palette.mutedForeground)
                            HStack(spacing: 4) {
                                ForEach(1...5, id: \.self) { star in
                                    Button {
                                        rating = star == rating ? 0 : star
                                    } label: {
                                        Image(systemName: star <= rating ? "star.fill" : "star")
                                            .font(.system(size: 18, weight: .semibold))
                                            .foregroundStyle(star <= rating ? Palette.primary : Palette.mutedForeground)
                                    }
                                    .buttonStyle(.plain)
                                    .accessibilityLabel("\(star) star\(star == 1 ? "" : "s")")
                                    .accessibilityAddTraits(star <= rating ? .isSelected : [])
                                }
                            }
                        }
                        .frame(maxWidth: .infinity)

                        VStack(spacing: 6) {
                            Text("Intensity \(relief)/5")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Palette.mutedForeground)
                            Slider(value: Binding(
                                get: { Double(relief) },
                                set: { relief = Int($0.rounded()) }
                            ), in: 1...5, step: 1)
                            .tint(Palette.primary)
                            .accessibilityLabel("Intensity")
                            .accessibilityValue("\(relief) out of 5")
                        }
                        .frame(maxWidth: .infinity)
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

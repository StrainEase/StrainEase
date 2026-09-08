import SwiftUI

struct ReliefLogForm: View {
    let strainName: String
    var conditions: [String] = []
    @Environment(ReliefLogStore.self) private var logs
    @State private var open = false
    @State private var fit: ReliefFit = .justRight
    @State private var relief = 4
    @State private var note = ""
    @State private var extraCondition = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Button {
                open.toggle()
            } label: {
                Text(open ? "Cancel" : "How did this go?")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(open ? Palette.mutedForeground : Palette.primaryForeground)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(open ? Palette.card.opacity(0.55) : Palette.primary, in: Capsule())
                    .overlay(
                        Capsule()
                            .strokeBorder(open ? Palette.border : Palette.primary, lineWidth: 1)
                    )
                    .contentShape(Capsule())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(open ? "Cancel relief log" : "Log how this strain went")

            if open {
                VStack(alignment: .leading, spacing: 12) {
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
                .padding(12)
                .background(Palette.muted.opacity(0.35), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
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
            relief: relief,
            note: note
        )
        open = false
        note = ""
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
                                Text(log.fit.label)
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(Palette.foreground)
                                Spacer()
                                Text("\(log.relief)/5 relief")
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

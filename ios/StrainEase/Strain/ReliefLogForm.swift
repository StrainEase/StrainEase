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

    // Session-journal fields (PR-W1 parity, see `src/lib/relief-log.ts`).
    @State private var showSessionDetails = false
    @State private var form: ConsumeForm? = nil
    @State private var doseText: String = ""
    @State private var timeOfDay: SessionTimeOfDay? = nil
    @State private var onsetText: String = ""
    @State private var selectedEffects: Set<SessionSideEffect> = []
    @State private var wouldRepeat: Bool? = nil

    var body: some View {
        // The logging/experience card is always expanded and uses the
        // standard SWCard chrome — no collapse toggle (matches Android
        // `ReliefLogForm` and web's expanded relief log).
        SWCard {
            VStack(alignment: .leading, spacing: 12) {
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
                // ── Session-details disclosure (PR-W1 parity) ─────────
                sessionDetailsDisclosure
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

    @ViewBuilder
    private var sessionDetailsDisclosure: some View {
        DisclosureGroup(isExpanded: $showSessionDetails) {
            VStack(alignment: .leading, spacing: 10) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Form")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Palette.mutedForeground)
                    FlowLayout(spacing: 8) {
                        ForEach(ConsumeForm.allCases) { option in
                            SWChip(title: option.label, isOn: form == option) {
                                form = (form == option) ? nil : option
                            }
                        }
                    }
                }
                HStack(spacing: 10) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("THC dose (mg)")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Palette.mutedForeground)
                        TextField("e.g. 10", text: $doseText)
                            .keyboardType(.numberPad)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Palette.muted.opacity(0.6), in: Capsule())
                    }
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Onset (min)")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Palette.mutedForeground)
                        TextField("e.g. 8", text: $onsetText)
                            .keyboardType(.numberPad)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Palette.muted.opacity(0.6), in: Capsule())
                    }
                }
                VStack(alignment: .leading, spacing: 6) {
                    Text("Time of day")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Palette.mutedForeground)
                    FlowLayout(spacing: 8) {
                        ForEach(SessionTimeOfDay.allCases) { option in
                            SWChip(title: option.label, isOn: timeOfDay == option) {
                                timeOfDay = (timeOfDay == option) ? nil : option
                            }
                        }
                    }
                }
                VStack(alignment: .leading, spacing: 6) {
                    Text("Side effects (optional)")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Palette.mutedForeground)
                    FlowLayout(spacing: 8) {
                        ForEach(SessionSideEffect.allCases) { effect in
                            SWChip(title: effect.label, isOn: selectedEffects.contains(effect)) {
                                if selectedEffects.contains(effect) {
                                    selectedEffects.remove(effect)
                                } else {
                                    selectedEffects.insert(effect)
                                }
                            }
                        }
                    }
                }
                VStack(alignment: .leading, spacing: 6) {
                    Text("Would you reach for it again?")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Palette.mutedForeground)
                    HStack(spacing: 8) {
                        SWChip(title: "Yes", isOn: wouldRepeat == true) {
                            wouldRepeat = (wouldRepeat == true) ? nil : true
                        }
                        SWChip(title: "No", isOn: wouldRepeat == false) {
                            wouldRepeat = (wouldRepeat == false) ? nil : false
                        }
                    }
                }
            }
            .padding(.top, 6)
        } label: {
            HStack(spacing: 6) {
                Image(systemName: "list.bullet.rectangle")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.primary)
                Text("Add session details")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Palette.foreground)
            }
        }
        .tint(Palette.primary)
    }

    private func save() async {
        var merged = conditions
        let extra = extraCondition.trimmingCharacters(in: .whitespacesAndNewlines)
        if !extra.isEmpty { merged.append(extra) }
        let doseMg = Int(doseText.trimmingCharacters(in: .whitespacesAndNewlines))
        let onset = Int(onsetText.trimmingCharacters(in: .whitespacesAndNewlines))
        await logs.add(
            strainName: strainName,
            conditions: merged,
            fit: fit,
            rating: rating,
            relief: relief,
            note: note,
            form: form,
            doseMg: doseMg,
            timeOfDay: timeOfDay,
            onsetMinutes: onset,
            sideEffects: selectedEffects.isEmpty ? nil : Array(selectedEffects),
            wouldRepeat: wouldRepeat
        )
        note = ""
        rating = 0
        extraCondition = ""
        form = nil
        doseText = ""
        timeOfDay = nil
        onsetText = ""
        selectedEffects = []
        wouldRepeat = nil
        showSessionDetails = false
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
                            // Session-journal details (PR-i1 parity).
                            if hasSessionDetails(log) {
                                sessionDetailRow(log)
                            }
                            if !log.note.isEmpty {
                                Text(log.note)
                                    .font(.system(size: 14))
                                    .foregroundStyle(Palette.foreground)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            HStack {
                                Text(formatted(log.createdAt))
                                    .font(.system(size: 11))
                                    .foregroundStyle(Palette.mutedForeground)
                                Spacer()
                                if log.wouldRepeat == true {
                                    Label("Would repeat", systemImage: "arrow.clockwise")
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundStyle(Palette.primary)
                                } else if log.wouldRepeat == false {
                                    Label("One and done", systemImage: "xmark.circle")
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundStyle(Palette.mutedForeground)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private func hasSessionDetails(_ log: ReliefLog) -> Bool {
        log.form != nil
            || log.doseMg != nil
            || log.timeOfDay != nil
            || log.onsetMinutes != nil
            || (log.sideEffects?.isEmpty == false)
    }

    @ViewBuilder
    private func sessionDetailRow(_ log: ReliefLog) -> some View {
        let parts: [String] = [
            log.form?.label,
            log.doseMg.map { "\($0) mg THC" },
            log.timeOfDay?.label,
            log.onsetMinutes.map { "\($0) min onset" },
        ].compactMap { $0 }
        let effects = (log.sideEffects ?? []).map { $0.label }
        if parts.isEmpty && effects.isEmpty {
            EmptyView()
        } else {
            VStack(alignment: .leading, spacing: 4) {
                if !parts.isEmpty {
                    Text(parts.joined(separator: " · "))
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Palette.mutedForeground)
                }
                if !effects.isEmpty {
                    Text("Side effects: \(effects.joined(separator: ", "))")
                        .font(.system(size: 12))
                        .foregroundStyle(Palette.mutedForeground)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }

    private func formatted(_ millis: Int) -> String {
        Date(timeIntervalSince1970: TimeInterval(millis) / 1000)
            .formatted(date: .abbreviated, time: .omitted)
    }
}

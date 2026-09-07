// Form for today's check-in. Four 1-5 scales, optional note,
// and a "Clear" affordance so the patient can wipe the day if
// they logged by mistake. Direct port of the web
// `CheckInForm.tsx` shape.

import SwiftUI

struct CheckInForm: View {
    @Environment(CheckInStore.self) private var store

    @State private var metrics: CheckInMetrics = defaultCheckInMetrics
    @State private var note: String = ""
    @State private var didHydrate = false
    @State private var isSaving = false

    /// `today` is the patient's current check-in for today, or
    /// `nil` if they haven't logged one yet. `onSaved` lets the
    /// panel collapse after a successful write.
    var today: CheckIn?
    var onSaved: (() -> Void)?

    private let scales: [(key: WritableKeyPath<CheckInMetrics, Int>, label: String, hint: String, highIsGood: Bool)] = [
        (\.mood, "Mood", "1 = awful, 5 = great", true),
        (\.sleep, "Sleep", "1 = none, 5 = fully rested", true),
        (\.pain, "Pain", "1 = none, 5 = severe", false),
        (\.anxiety, "Anxiety", "1 = calm, 5 = severe", false),
    ]

    private var noteBinding: Binding<String> {
        Binding(
            get: { String(note.prefix(CheckInStore.checkInNoteMax)) },
            set: { note = String($0.prefix(CheckInStore.checkInNoteMax)) }
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            ForEach(scales, id: \.label) { scale in
                scaleRow(scale)
            }
            VStack(alignment: .leading, spacing: 6) {
                Text("Note (optional)")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Palette.mutedForeground)
                TextField(
                    "Anything to remember?",
                    text: noteBinding,
                    axis: .vertical
                )
                .lineLimit(3, reservesSpace: true)
                .padding(10)
                .background(Palette.card, in: RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .strokeBorder(Palette.border, lineWidth: 1)
                )
                .font(.system(size: 14))
                Text("\(note.count) / \(CheckInStore.checkInNoteMax)")
                    .font(.system(size: 11))
                    .foregroundStyle(Palette.mutedForeground)
            }
            HStack(spacing: 10) {
                Button {
                    Task { await save() }
                } label: {
                    HStack(spacing: 6) {
                        if isSaving {
                            ProgressView()
                                .controlSize(.small)
                        } else {
                            Image(systemName: "checkmark")
                        }
                        Text("Save")
                    }
                    .font(.system(size: 14, weight: .semibold))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .frame(maxWidth: .infinity)
                    .foregroundStyle(Palette.primaryForeground)
                    .background(Palette.primary, in: Capsule())
                }
                .buttonStyle(.plain)
                .disabled(isSaving)

                if today != nil {
                    Button(role: .destructive) {
                        Task { await clear() }
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "trash")
                            Text("Clear")
                        }
                        .font(.system(size: 14, weight: .medium))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .foregroundStyle(Palette.foreground)
                        .background(Palette.card, in: Capsule())
                        .overlay(
                            Capsule().strokeBorder(Palette.border, lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                    .disabled(isSaving)
                }
            }
        }
        .onAppear { hydrateIfNeeded() }
        .onChange(of: today?.updatedAt) { _, _ in hydrateIfNeeded() }
    }

    private func scaleRow(_ scale: (key: WritableKeyPath<CheckInMetrics, Int>, label: String, hint: String, highIsGood: Bool)) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(scale.label)
                    .font(.system(size: 14, weight: .semibold))
                Spacer()
                Text(scale.hint)
                    .font(.system(size: 11))
                    .foregroundStyle(Palette.mutedForeground)
            }
            HStack(spacing: 6) {
                ForEach(1...5, id: \.self) { i in
                    let selected = metrics[keyPath: scale.key] == i
                    Button {
                        metrics[keyPath: scale.key] = i
                    } label: {
                        Text("\(i)")
                            .font(.system(size: 14, weight: .semibold))
                            .frame(width: 38, height: 38)
                            .foregroundStyle(selected ? Palette.primaryForeground : Palette.foreground)
                            .background(
                                selected ? colorForMetric(i, highIsGood: scale.highIsGood) : Palette.card,
                                in: Circle()
                            )
                            .overlay(
                                Circle().strokeBorder(
                                    selected ? Color.clear : Palette.border,
                                    lineWidth: 1
                                )
                            )
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(scale.label) \(i) of 5")
                }
            }
        }
    }

    private func colorForMetric(_ value: Int, highIsGood: Bool) -> Color {
        let goodEnd = highIsGood ? 5 : 1
        let distance = abs(value - goodEnd)
        if distance <= 1 { return .green }
        if distance <= 2 { return .orange }
        return .red
    }

    private func hydrateIfNeeded() {
        guard !didHydrate || today?.updatedAt != nil else {
            if let today {
                metrics = today.metrics
                note = today.note
            }
            didHydrate = true
            return
        }
        if let today {
            metrics = today.metrics
            note = today.note
        } else {
            metrics = defaultCheckInMetrics
            note = ""
        }
        didHydrate = true
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        await store.upsertToday(metrics: metrics, note: note)
        if store.errorMessage == nil {
            onSaved?()
        }
    }

    private func clear() async {
        isSaving = true
        defer { isSaving = false }
        await store.delete(dateId: CheckInStore.todayKey())
    }
}

#Preview("Empty") {
    SWCard {
        VStack(alignment: .leading, spacing: 12) {
            SectionLabel("Daily check-in")
            CheckInForm(today: nil)
        }
    }
    .padding()
    .environment(CheckInStore.preview([]))
}

#Preview("With Today") {
    let today = CheckIn(
        id: CheckInStore.todayKey(),
        date: CheckInStore.todayKey(),
        metrics: CheckInMetrics(mood: 4, sleep: 3, pain: 2, anxiety: 2),
        note: "Felt good after a long walk.",
        createdAt: 1_700_000_000_000,
        updatedAt: 1_700_000_000_000
    )
    return SWCard {
        VStack(alignment: .leading, spacing: 12) {
            SectionLabel("Daily check-in")
            CheckInForm(today: today)
        }
    }
    .padding()
    .environment(CheckInStore.preview([today]))
}

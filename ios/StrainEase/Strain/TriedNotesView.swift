import SwiftUI

struct TriedNotesView: View {
    let profile: StrainProfile
    @Environment(SavedStrainsStore.self) private var saved
    @Environment(AuthSession.self) private var session
    @State private var draft = ""
    @State private var draftAnonymous = true
    @State private var draftRating = 0
    @State private var draftIntensity = 0
    @State private var savedAt: Date?
    @State private var savedTick = 0

    private var notes: [SavedNote] { saved.notes(for: profile.slug) }
    private var authorName: String { session.user?.name ?? "A patient" }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionLabel("Review")
            SWCard {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Write a review of how this strain felt — it's public on this strain's page. Toggle the lock to stay anonymous (shown as \"A patient\").")
                        .font(.system(size: 13))
                        .foregroundStyle(Palette.mutedForeground)
                        .fixedSize(horizontal: false, vertical: true)

                    if notes.isEmpty {
                        Text("Nothing here yet — one sentence is enough to start a review.")
                            .font(.system(size: 14))
                            .foregroundStyle(Palette.mutedForeground)
                    } else {
                        ForEach(notes) { note in
                            HStack(alignment: .top, spacing: 10) {
                                VStack(alignment: .leading, spacing: 4) {
                                    if note.rating > 0 || note.intensity > 0 {
                                        HStack(spacing: 8) {
                                            if note.rating > 0 {
                                                starRow(rating: note.rating, size: 9)
                                            }
                                            if note.intensity > 0 {
                                                intensityDots(value: note.intensity)
                                            }
                                        }
                                        .accessibilityElement(children: .ignore)
                                        .accessibilityLabel(
                                            "\(note.rating > 0 ? "Rated \(note.rating) of 5" : "")\(note.rating > 0 && note.intensity > 0 ? ", " : "")\(note.intensity > 0 ? "intensity \(note.intensity) of 5" : "")"
                                        )
                                    }
                                    Text(note.text)
                                        .font(.system(size: 15))
                                        .foregroundStyle(Palette.foreground)
                                        .fixedSize(horizontal: false, vertical: true)
                                    Text(Self.formatted(note.createdAt))
                                        .font(.system(size: 11))
                                        .foregroundStyle(Palette.mutedForeground)
                                }
                                Spacer(minLength: 8)
                                VStack(alignment: .trailing, spacing: 8) {
                                    Button {
                                        Task {
                                            await saved.setNoteAnonymous(
                                                slug: profile.slug,
                                                noteId: note.id,
                                                anonymous: !note.anonymous,
                                                authorName: authorName,
                                                strainName: profile.name
                                            )
                                        }
                                    } label: {
                                        Label(
                                            note.anonymous ? "Anonymous" : "Your name",
                                            systemImage: note.anonymous ? "lock" : "person"
                                        )
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundStyle(note.anonymous ? Palette.mutedForeground : Palette.primary)
                                    }
                                    .buttonStyle(.plain)
                                    .accessibilityLabel(note.anonymous ? "Show your name on this review" : "Hide your name on this review")
                                    Button {
                                        Task { await saved.removeNote(slug: profile.slug, noteId: note.id) }
                                    } label: {
                                        Image(systemName: "trash")
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundStyle(Palette.destructive)
                                    }
                                    .buttonStyle(.plain)
                                    .accessibilityLabel("Delete note")
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }

                    // Rating and Intensity recorded separately, two
                    // centered columns — mirrors the Android
                    // "How did it work for you?" card. Tap the selected
                    // star/dot again to clear.
                    HStack(alignment: .center, spacing: 24) {
                        VStack(spacing: 6) {
                            Text("Rating")
                                .font(.system(size: 11, weight: .semibold))
                                .tracking(0.8)
                                .textCase(.uppercase)
                                .foregroundStyle(Palette.mutedForeground)
                            HStack(spacing: 6) {
                                ForEach(1...5, id: \.self) { value in
                                    Button {
                                        draftRating = draftRating == value ? 0 : value
                                    } label: {
                                        Image(systemName: value <= draftRating ? "star.fill" : "star")
                                            .font(.system(size: 17, weight: .medium))
                                            .foregroundStyle(value <= draftRating ? Palette.primary : Palette.muted.opacity(0.7))
                                    }
                                    .buttonStyle(.plain)
                                    .accessibilityLabel("Rate \(value) out of 5")
                                }
                            }
                            if draftRating > 0 {
                                Text("\(draftRating)/5")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundStyle(Palette.mutedForeground)
                            }
                        }
                        .frame(maxWidth: .infinity)

                        VStack(spacing: 6) {
                            Text("Intensity")
                                .font(.system(size: 11, weight: .semibold))
                                .tracking(0.8)
                                .textCase(.uppercase)
                                .foregroundStyle(Palette.mutedForeground)
                            HStack(spacing: 6) {
                                ForEach(1...5, id: \.self) { value in
                                    Button {
                                        draftIntensity = draftIntensity == value ? 0 : value
                                    } label: {
                                        Circle()
                                            .fill(value <= draftIntensity ? Palette.primary : Palette.muted.opacity(0.5))
                                            .frame(width: 12, height: 12)
                                            .padding(2)
                                    }
                                    .buttonStyle(.plain)
                                    .accessibilityLabel("Set intensity \(value) out of 5")
                                }
                            }
                            if draftIntensity > 0 {
                                Text("\(draftIntensity)/5")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundStyle(Palette.mutedForeground)
                            }
                        }
                        .frame(maxWidth: .infinity)
                    }

                    HStack(spacing: 8) {
                        TextField("How did this one treat you?", text: $draft)
                            .textInputAutocapitalization(.sentences)
                            .submitLabel(.done)
                            .onSubmit { Task { await submit() } }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Palette.muted.opacity(0.6), in: Capsule())
                        Button {
                            draftAnonymous.toggle()
                        } label: {
                            Image(systemName: draftAnonymous ? "lock" : "person")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(draftAnonymous ? Palette.mutedForeground : Palette.primary)
                                .frame(width: 36, height: 36)
                                .background(Palette.muted.opacity(0.6), in: Circle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(draftAnonymous ? "Show your name on this review" : "Post this review anonymously")
                        Button {
                            Task { await submit() }
                        } label: {
                            Text("Save")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Palette.primaryForeground)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .background(Palette.primary, in: Capsule())
                        }
                        .buttonStyle(.plain)
                        .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || saved.isBusy)
                    }
                }
            }
        }
        .overlay(alignment: .top) {
            if savedAt != nil {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(Palette.primary)
                    Text("Note saved")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Palette.foreground)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(Palette.card, in: Capsule())
                .overlay(Capsule().strokeBorder(Palette.border, lineWidth: 1))
                .padding(.top, 10)
                .transition(.move(edge: .top).combined(with: .opacity))
                .accessibilityLabel("Note saved")
            }
        }
        .animation(.snappy(duration: 0.28), value: savedAt)
        .sensoryFeedback(.success, trigger: savedTick)
        .task(id: savedAt) {
            guard savedAt != nil else { return }
            try? await Task.sleep(for: .milliseconds(1800))
            if savedAt != nil { savedAt = nil }
        }
    }

    /// Five stars, `rating` of them filled — used for both the draft
    /// picker-sized stars and the compact note-list stars.
    private func starRow(rating: Int, size: CGFloat) -> some View {
        HStack(spacing: 2) {
            ForEach(1...5, id: \.self) { index in
                Image(systemName: index <= rating ? "star.fill" : "star")
                    .font(.system(size: size, weight: .medium))
                    .foregroundStyle(index <= rating ? Palette.primary : Palette.muted.opacity(0.5))
            }
        }
        .accessibilityLabel("\(rating) out of 5 stars")
    }

    /// Five dots, `value` of them filled — compact intensity readout
    /// for the note list, mirroring the Android tried-notes rail.
    private func intensityDots(value: Int) -> some View {
        HStack(spacing: 2) {
            ForEach(1...5, id: \.self) { index in
                Circle()
                    .fill(index <= value ? Palette.primary : Palette.muted.opacity(0.5))
                    .frame(width: 6.5, height: 6.5)
            }
        }
        .accessibilityLabel("Intensity \(value) out of 5")
    }

    private func submit() async {
        let text = draft
        let anonymous = draftAnonymous
        let rating = draftRating
        let intensity = draftIntensity
        draft = ""
        draftAnonymous = true
        draftRating = 0
        draftIntensity = 0
        await saved.addNote(
            to: profile,
            text: text,
            anonymous: anonymous,
            authorName: authorName,
            rating: rating,
            intensity: intensity
        )
        // addNote only sets errorMessage on failure — treat a clean run as saved.
        if saved.errorMessage == nil {
            savedAt = Date()
            savedTick += 1
        }
    }

    private static func formatted(_ millis: Int) -> String {
        let date = Date(timeIntervalSince1970: TimeInterval(millis) / 1000)
        return date.formatted(date: .abbreviated, time: .omitted)
    }
}

import SwiftUI

/// Small pencil badge that lights up next to a strain whenever the
/// signed-in user has at least one saved note on it. Reads from the
/// shared `SavedStrainsStore` so it stays in sync as notes are added
/// or removed anywhere in the app. Renders nothing for unauthenticated
/// users (the env store is always present, but the slug won't be in its
/// items so `notes(for:)` returns `[]`).
///
/// Mirrors the web `StrainNoteIndicator` (`NotebookPen` icon, primary
/// color, icon-only at the default size). Pair it inline next to any
/// strain name — header hero, compare chip, recommendation card,
/// terpene family row, etc.
struct NoteBadge: View {
    /// Profile or slug the badge belongs to. `StrainProfile` is preferred
    /// because the view recomputes on the slug path; passing a name is
    /// also fine since `slug` falls back to it.
    let profile: StrainProfile

    /// Icon size in points. Default matches the existing
    /// `StrainPoster` indicator (compact / non-compact aware via callers).
    var size: CGFloat = 13

    /// Pass `true` when the badge sits in a tighter container (a chip
    /// or compact card) so the spacing tightens up. Doesn't change the
    /// icon, just the leading padding from the surrounding text.
    var compact = false

    @Environment(SavedStrainsStore.self) private var saved

    private var count: Int {
        saved.notes(for: profile.slug).count
    }

    var body: some View {
        if count > 0 {
            Image(systemName: "square.and.pencil")
                .font(.system(size: size, weight: .semibold))
                .foregroundStyle(Palette.primary)
                .padding(.leading, compact ? 2 : 4)
                .accessibilityHidden(true)
        }
    }
}

extension NoteBadge {
    /// Voiceover-friendly label matching the web `StrainNoteIndicator`
    /// copy. Use as `accessibilityLabel(...)` on the parent view that
    /// also names the strain so VoiceOver hears "Blue Dream, 2 notes".
    static func accessibilityLabel(for profile: StrainProfile, count: Int) -> String {
        guard count > 0 else { return profile.name }
        let noun = count == 1 ? "note" : "notes"
        return "\(profile.name), \(count) \(noun)"
    }
}
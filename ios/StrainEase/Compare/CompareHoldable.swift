import SwiftUI

/// Press-and-hold a strain poster to add it to the compare selection.
///
/// Cross-platform parity with the web's
/// `src/components/strain/ComparableStrainPoster.tsx`: the same 0.5s
/// hold, a success haptic on add (matching the web's toast), and the
/// same "already in the tray" checkmark badge. A plain tap still flows
/// through to the underlying button/link — the long-press gesture only
/// claims touches that hold still past the threshold, so scrolling the
/// rails is unaffected.
struct CompareHoldable: ViewModifier {
    let name: String

    @Environment(CompareSelectionStore.self) private var store
    // Tokens only exist so `.sensoryFeedback` has an Equatable value to
    // watch; the number itself is meaningless.
    @State private var addHapticToken = 0
    @State private var duplicateHapticToken = 0

    func body(content: Content) -> some View {
        content
            .overlay(alignment: .topTrailing) {
                if store.isIn(name) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Palette.primary)
                        .background {
                            Circle()
                                .fill(Palette.background)
                                .padding(2)
                        }
                        .padding(6)
                        .transition(.scale.combined(with: .opacity))
                        .accessibilityHidden(true)
                }
            }
            .animation(.snappy(duration: 0.25), value: store.isIn(name))
            .onLongPressGesture(minimumDuration: 0.5, maximumDistance: 12) {
                if store.add(name) {
                    addHapticToken += 1
                } else if store.isIn(name) {
                    // Already in the tray — a light tap-back haptic instead
                    // of silence, so the gesture never feels dead.
                    duplicateHapticToken += 1
                }
            }
            .sensoryFeedback(.success, trigger: addHapticToken)
            .sensoryFeedback(.impact(weight: .light), trigger: duplicateHapticToken)
            // Long-press is invisible to assistive tech; give VoiceOver an
            // explicit named action that performs the same add.
            .accessibilityAction(named: Text("Add to compare")) {
                _ = store.add(name)
            }
    }
}

extension View {
    /// Press-and-hold to add this strain to the compare selection.
    /// See `CompareHoldable` for the gesture contract.
    func compareHoldable(_ name: String) -> some View {
        modifier(CompareHoldable(name: name))
    }
}

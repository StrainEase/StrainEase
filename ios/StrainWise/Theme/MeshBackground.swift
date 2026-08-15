import SwiftUI

/// Quiet two-orb mesh. No blur on scrolling content — just layered radials.
struct MeshBackground: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        ZStack {
            Palette.background
            RadialGradient(
                colors: [Palette.glowMint, .clear],
                center: .topTrailing,
                startRadius: 20,
                endRadius: 420
            )
            .offset(x: 40, y: -80)
            RadialGradient(
                colors: [Palette.glowDeep, .clear],
                center: .bottomLeading,
                startRadius: 10,
                endRadius: 380
            )
            .offset(x: -30, y: 120)
            if colorScheme == .dark {
                LinearGradient(
                    colors: [.clear, Palette.background.opacity(0.55)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }
}

import SwiftUI

/// Full-screen SwiftUI splash shown immediately after the system
/// launch screen. This gives us full control over logo sizing,
/// corner radius, and the green glow — things the static
/// `UILaunchScreen` plist image cannot do.
///
/// The system launch screen (plain background color) fills the
/// gap while SwiftUI loads, then this view appears for ~1.2s
/// before cross-fading to the real root content.
struct SplashScreenView: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        ZStack {
            // Match the system launch-screen background so the
            // transition from plist → SwiftUI is seamless.
            LaunchBackground.color
            MeshBackground()

            GeometryReader { geo in
                let side = geo.size.width / 3
                Image("AppLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: side, height: side)
                    .clipShape(
                        RoundedRectangle(cornerRadius: side * 0.22, style: .continuous)
                    )
                    // Layered green glow behind the logo.
                    .shadow(color: Palette.primary.opacity(0.6), radius: side * 0.18)
                    .shadow(color: Palette.primary.opacity(0.3), radius: side * 0.35)
                    .frame(width: geo.size.width, height: geo.size.height)
                    .position(x: geo.size.width / 2, y: geo.size.height / 2)
            }
        }
        .ignoresSafeArea()
        .accessibilityHidden(true)
    }
}

/// Convenience access to the launch-screen background color asset.
private enum LaunchBackground {
    static var color: Color {
        Color("LaunchBackground", bundle: .main)
    }
}

#Preview {
    SplashScreenView()
        .preferredColorScheme(.dark)
}

#Preview("Light") {
    SplashScreenView()
        .preferredColorScheme(.light)
}

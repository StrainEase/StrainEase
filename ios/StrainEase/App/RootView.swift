import SwiftUI

struct RootView: View {
    @Environment(AuthSession.self) private var session
    @Environment(AgeVerificationStore.self) private var ageVerification

    @State private var showSplash = true

    var body: some View {
        ZStack {
            Group {
                if !ageVerification.isVerified {
                    AgeGateView(store: ageVerification)
                } else {
                    switch session.status {
                    case .loading:
                        ZStack {
                            MeshBackground()
                            ProgressView()
                                .tint(Palette.primary)
                                .controlSize(.large)
                        }
                    case .signedOut:
                        SignInView()
                    case .signedIn:
                        MainTabView()
                    }
                }
            }

            if showSplash {
                SplashScreenView()
                    .transition(.opacity)
                    .zIndex(1)
            }
        }
        .animation(.snappy(duration: 0.35), value: session.isSignedIn)
        .animation(.snappy(duration: 0.35), value: ageVerification.isVerified)
        .animation(.easeOut(duration: 0.4), value: showSplash)
        .task {
            // Hold the splash long enough for the system launch
            // screen handoff to feel seamless, then fade out.
            try? await Task.sleep(nanoseconds: 1_200_000_000)
            withAnimation(.easeOut(duration: 0.4)) {
                showSplash = false
            }
        }
    }
}

#Preview("Signed out") {
    RootView()
        .environment(AuthSession.previewSignedOut)
        .environment(AgeVerificationStore.preview())
        .environment(SavedStrainsStore.preview())
        .environment(RecentlyViewedStore.preview())
        .environment(ReliefLogStore.preview())
}

#Preview("Signed in") {
    RootView()
        .environment(AuthSession.previewSignedIn)
        .environment(AgeVerificationStore.preview())
        .environment(SavedStrainsStore.preview())
        .environment(RecentlyViewedStore.preview([.sampleGDP]))
        .environment(ReliefLogStore.preview())
}

#Preview("Age gate") {
    RootView()
        .environment(AuthSession.previewSignedOut)
        .environment(AgeVerificationStore())
        .environment(SavedStrainsStore.preview())
        .environment(RecentlyViewedStore.preview())
        .environment(ReliefLogStore.preview())
}

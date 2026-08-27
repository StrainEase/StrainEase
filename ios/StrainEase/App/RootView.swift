import SwiftUI

struct RootView: View {
    @Environment(AuthSession.self) private var session
    @Environment(AgeVerificationStore.self) private var ageVerification

    var body: some View {
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
        .animation(.snappy(duration: 0.35), value: session.isSignedIn)
        .animation(.snappy(duration: 0.35), value: ageVerification.isVerified)
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

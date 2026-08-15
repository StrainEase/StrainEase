import GoogleSignIn
import SwiftUI

@main
struct StrainWiseApp: App {
    @State private var session = AuthSession()
    @State private var saved = SavedStrainsStore()
    @State private var recents = RecentlyViewedStore()

    init() {
        FirebaseBootstrap.configure()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .environment(saved)
                .environment(recents)
                .tint(Palette.primary)
                .preferredColorScheme(nil)
                .onAppear { session.start() }
                .onChange(of: session.user?.uid, initial: true) { _, uid in
                    if let uid {
                        saved.listen(uid: uid)
                    } else {
                        saved.reset()
                    }
                }
                .onOpenURL { url in
                    GIDSignIn.sharedInstance.handle(url)
                }
        }
    }
}

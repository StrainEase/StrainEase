import GoogleSignIn
import SwiftUI

@main
struct StrainWiseApp: App {
    @State private var session = AuthSession()
    @State private var saved = SavedStrainsStore()
    @State private var ailments = SavedAilmentsStore()
    @State private var recents = RecentlyViewedStore()
    @State private var logs = ReliefLogStore()

    init() {
        FirebaseBootstrap.configure()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .environment(saved)
                .environment(ailments)
                .environment(recents)
                .environment(logs)
                .tint(Palette.primary)
                .preferredColorScheme(nil)
                .onAppear { session.start() }
                .onChange(of: session.user?.uid, initial: true) { _, uid in
                    if let uid {
                        saved.listen(uid: uid)
                        ailments.listen(uid: uid)
                        logs.listen(uid: uid)
                    } else {
                        saved.reset()
                        ailments.reset()
                        logs.reset()
                    }
                }
                .onOpenURL { url in
                    GIDSignIn.sharedInstance.handle(url)
                }
        }
    }
}

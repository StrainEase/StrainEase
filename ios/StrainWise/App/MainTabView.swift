import SwiftUI

struct MainTabView: View {
    @State private var homeModel = HomeModel()
    @State private var findModel = FindModel()

    var body: some View {
        tabContent
            .tint(Palette.primary)
    }

    @ViewBuilder
    private var tabContent: some View {
        if #available(iOS 18, *) {
            TabView {
                Tab("Home", systemImage: "house.fill") {
                    HomeView(model: homeModel)
                }
                Tab("Search", systemImage: "magnifyingglass") {
                    FindView(model: findModel)
                }
                Tab("Account", systemImage: "person.fill") {
                    AccountView()
                }
            }
        } else {
            TabView {
                HomeView(model: homeModel)
                    .tabItem { Label("Home", systemImage: "house.fill") }
                FindView(model: findModel)
                    .tabItem { Label("Search", systemImage: "magnifyingglass") }
                AccountView()
                    .tabItem { Label("Account", systemImage: "person.fill") }
            }
        }
    }
}

#Preview("Tabs") {
    MainTabView()
        .environment(\.strainAPI, PreviewStrainAPI())
        .environment(AuthSession.previewSignedIn)
        .environment(SavedStrainsStore.preview(["granddaddy-purple"]))
        .environment(RecentlyViewedStore.preview([.sampleGDP]))
}

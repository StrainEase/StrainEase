import SwiftUI

struct MainTabView: View {
    @State private var homeModel = HomeModel()
    @State private var findModel = FindModel()
    @State private var directoryModel = DirectoryModel()
    @State private var nav = AppNavigation()

    var body: some View {
        @Bindable var nav = nav
        tabContent(selection: $nav.tab)
            .tint(Palette.primary)
            .environment(nav)
            .sheet(isPresented: $nav.showAccount) {
                AccountView()
                    .environment(nav)
            }
            .sheet(isPresented: $nav.showSaved) {
                NavigationStack {
                    SavedStrainsView(showsClose: true)
                }
                .tint(Palette.primary)
            }
    }

    @ViewBuilder
    private func tabContent(selection: Binding<AppTab>) -> some View {
        if #available(iOS 18, *) {
            TabView(selection: selection) {
                Tab("Home", systemImage: AppTab.home.systemImage, value: AppTab.home) {
                    HomeView(model: homeModel)
                }
                Tab("Find", systemImage: AppTab.find.systemImage, value: AppTab.find) {
                    FindView(model: findModel)
                }
                Tab("Browse", systemImage: AppTab.browse.systemImage, value: AppTab.browse) {
                    DirectoryView(model: directoryModel)
                }
            }
        } else {
            TabView(selection: selection) {
                HomeView(model: homeModel)
                    .tabItem { Label("Home", systemImage: AppTab.home.systemImage) }
                    .tag(AppTab.home)
                FindView(model: findModel)
                    .tabItem { Label("Find", systemImage: AppTab.find.systemImage) }
                    .tag(AppTab.find)
                DirectoryView(model: directoryModel)
                    .tabItem { Label("Browse", systemImage: AppTab.browse.systemImage) }
                    .tag(AppTab.browse)
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
        .environment(SavedAilmentsStore.preview(["Insomnia"]))
        .environment(ReliefLogStore.preview([.sampleSleep]))
}

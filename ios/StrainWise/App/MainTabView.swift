import SwiftUI

struct MainTabView: View {
    @State private var homeModel = HomeModel()
    @State private var findModel: FindModel
    @State private var directoryModel = DirectoryModel()
    @State private var doctorsModel = DoctorsModel()
    @State private var nav = AppNavigation()
    @State private var compareStore = CompareSelectionStore()

    init() {
        let store = CompareSelectionStore()
        _compareStore = State(wrappedValue: store)
        _findModel = State(wrappedValue: FindModel(compareStore: store))
    }

    var body: some View {
        @Bindable var nav = nav
        tabContent(selection: $nav.tab)
            .tint(Palette.primary)
            .safeAreaInset(edge: .bottom, spacing: 0) {
                CompareTrayBar()
            }
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
            // Applied last so the tray (safeAreaInset) and tab content
            // both see the same store. Inset content is a sibling of
            // earlier modifiers, not a descendant.
            .environment(nav)
            .environment(compareStore)
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
                Tab("Doctors", systemImage: AppTab.doctors.systemImage, value: AppTab.doctors) {
                    DoctorsView(model: doctorsModel)
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
                DoctorsView(model: doctorsModel)
                    .tabItem { Label("Doctors", systemImage: AppTab.doctors.systemImage) }
                    .tag(AppTab.doctors)
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
        .environment(CompareSelectionStore())
        .environment(ResearchHistoryStore.preview())
}

import SwiftUI

struct HomeView: View {
    @Environment(RecentlyViewedStore.self) private var recents
    @Environment(SavedAilmentsStore.self) private var ailmentsStore
    @Environment(AppNavigation.self) private var nav
    @State private var model: HomeModel
    @State private var path: [BrowseDestination] = []

    init(model: HomeModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        NavigationStack(path: $path) {
            ZStack {
                MeshBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: 28) {
                        hero
                        if model.hasSavedAilments,
                           !model.strains(for: .forYou).isEmpty
                        {
                            typeRail(.forYou)
                        }
                        typeRail(.popular)
                        AilmentCarousel(
                            ailments: model.ailmentsForCarousel,
                            preview: { Array(model.strains(for: .ailment($0)).prefix(model.previewLimit)) },
                            onSeeMore: { name in openGrid(.ailment(name), model.strains(for: .ailment(name))) },
                            onSelect: openProfile
                        )
                        typeRail(.sativa)
                        typeRail(.hybrid)
                        typeRail(.indica)
                        StrainRail(
                            title: HomeSection.recents.title,
                            strains: Array(recentProfiles.prefix(model.previewLimit)),
                            emptyText: "Open a strain and it’ll land here.",
                            onSeeMore: { openGrid(.recents, recentProfiles) },
                            onSelect: openProfile
                        )
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 32)
                }
                .refreshable { await model.load() }
            }
            .navigationTitle("Home")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.hidden, for: .navigationBar)
            .appChrome()
            .accessibilityIdentifier("home.root")
            .navigationDestination(for: BrowseDestination.self) { destination in
                switch destination {
                case .profile(let profile):
                    StrainDetailView(profile: profile)
                case .grid(let section, let strains):
                    StrainGridView(title: section.title, strains: strains, onSelect: openProfile)
                }
            }
            .onChange(of: nav.pendingStrain) { _, next in
                guard let next else { return }
                if !path.contains(where: { existing in
                    if case let .profile(pending) = existing {
                        return pending.id == next.id
                    }
                    return false
                }) {
                    path.append(.profile(next))
                }
                nav.consumePendingStrain()
            }
            .onChange(of: ailmentsStore.ailments) { _, next in
                model.updateSavedAilments(next)
            }
            .task {
                model.updateSavedAilments(ailmentsStore.ailments)
                await model.load()
            }
        }
        .tint(Palette.primary)
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 8) {
            Eyebrow(text: "Browse")
            Text(HomeHeadline.text())
                .font(.system(.largeTitle, design: .serif).weight(.regular))
                .foregroundStyle(Palette.foreground)
                .accessibilityIdentifier("home.headline")
            Text(HomeHeadline.subtitle)
                .font(.system(size: 15))
                .foregroundStyle(Palette.mutedForeground)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var recentProfiles: [StrainProfile] {
        StrainCatalog.applyingCatalogPhotos(recents.items)
    }

    private func typeRail(_ section: HomeSection) -> some View {
        StrainRail(
            title: section.title,
            strains: model.preview(section),
            onSeeMore: { openGrid(section, model.strains(for: section)) },
            onSelect: openProfile
        )
    }

    private func openProfile(_ profile: StrainProfile) {
        path.append(.profile(profile))
    }

    private func openGrid(_ section: HomeSection, _ strains: [StrainProfile]) {
        path.append(.grid(section, strains))
    }
}

#Preview("Home") {
    HomeView(model: HomeModel(api: PreviewStrainAPI()))
        .environment(\.strainAPI, PreviewStrainAPI())
        .environment(AppNavigation())
        .environment(AuthSession.previewSignedIn)
        .environment(RecentlyViewedStore.preview([.sampleGDP, .sampleBlueDream]))
        .environment(SavedStrainsStore.preview())
}

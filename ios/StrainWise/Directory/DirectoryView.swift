import SwiftUI

struct DirectoryView: View {
    @State private var model: DirectoryModel
    @State private var path: [StrainProfile] = []

    init(model: DirectoryModel) {
        _model = State(initialValue: model)
    }

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    var body: some View {
        @Bindable var model = model
        NavigationStack(path: $path) {
            ZStack {
                MeshBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        hero
                        searchField
                        filterRow("Type") { typeChips }
                        filterRow("Reported uses") { ailmentChips }
                        filterRow("THC") { thcChips }
                        filterRow("Effects") { effectChips }
                        if model.filtersActive {
                            Button("Reset filters", action: model.resetFilters)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Palette.primary)
                        }
                        results
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 32)
                }
                .refreshable { await model.load() }
            }
            .navigationTitle("Browse")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.hidden, for: .navigationBar)
            .appChrome()
            .navigationDestination(for: StrainProfile.self) { profile in
                StrainDetailView(profile: profile)
            }
            .task { await model.load() }
            .accessibilityIdentifier("browse.root")
        }
        .tint(Palette.primary)
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 8) {
            Eyebrow(text: "Strain directory")
            Text("Browse popular strains")
                .font(.system(.largeTitle, design: .serif).weight(.regular))
                .foregroundStyle(Palette.foreground)
            Text("Live from Leafly. Filter by type, THC, or the effects you’re after.")
                .font(.system(size: 15))
                .foregroundStyle(Palette.mutedForeground)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var searchField: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Palette.mutedForeground)
                .accessibilityHidden(true)
            TextField("Search the catalog", text: $model.query)
                .textInputAutocapitalization(.words)
                .autocorrectionDisabled()
            if !model.query.isEmpty {
                Button {
                    model.query = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(Palette.mutedForeground)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Clear search")
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 11)
        .background(Palette.card, in: Capsule())
        .overlay(Capsule().strokeBorder(Palette.border, lineWidth: 1))
        .accessibilityIdentifier("browse.search")
    }

    private var typeChips: some View {
        FlowLayout(spacing: 8) {
            ForEach(DirectoryFilter.TypeFilter.allCases) { option in
                SWChip(title: option.label, isOn: model.typeFilter == option) {
                    model.typeFilter = option
                }
            }
        }
    }

    private var thcChips: some View {
        FlowLayout(spacing: 8) {
            ForEach(DirectoryFilter.ThcBand.allCases) { band in
                SWChip(title: band.label, isOn: model.thcBand == band) {
                    model.thcBand = band
                }
            }
        }
    }

    private var ailmentChips: some View {
        FlowLayout(spacing: 8) {
            ForEach(Conditions.catalog, id: \.self) { condition in
                SWChip(
                    title: condition,
                    isOn: model.ailmentFilter.contains(condition)
                ) {
                    model.toggleAilment(condition)
                }
            }
        }
    }

    private var effectChips: some View {
        FlowLayout(spacing: 8) {
            ForEach(DirectoryFilter.EffectBucket.all) { bucket in
                SWChip(title: bucket.label, isOn: model.effectIDs.contains(bucket.id)) {
                    model.toggleEffect(bucket.id)
                }
            }
        }
    }

    private func filterRow<Content: View>(_ title: String, @ViewBuilder chips: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionLabel(title)
            chips()
        }
    }

    @ViewBuilder
    private var results: some View {
        if model.isLoading && model.strains.isEmpty {
            HStack(spacing: 10) {
                ProgressView()
                    .tint(Palette.primary)
                Text("Loading the catalog…")
                    .font(.system(size: 14))
                    .foregroundStyle(Palette.mutedForeground)
            }
            .padding(.vertical, 24)
            .frame(maxWidth: .infinity)
        } else if model.filtered.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text("No strains match")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Palette.foreground)
                Text(
                    model.filtersActive
                        ? "Try widening the type or THC filter, or removing an effect."
                        : "The popular catalog is empty right now."
                )
                .font(.system(size: 14))
                .foregroundStyle(Palette.mutedForeground)
            }
            .padding(.vertical, 16)
        } else {
            VStack(alignment: .leading, spacing: 12) {
                Text("Showing \(model.filtered.count) of \(model.strains.count) strains")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Palette.mutedForeground)
                LazyVGrid(columns: columns, spacing: 16) {
                    ForEach(model.filtered) { profile in
                        Button {
                            path.append(profile)
                        } label: {
                            StrainPoster(profile: profile)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }
}

#Preview("Browse") {
    DirectoryView(model: DirectoryModel(api: PreviewStrainAPI()))
        .environment(\.strainAPI, PreviewStrainAPI())
        .environment(AppNavigation())
        .environment(AuthSession.previewSignedIn)
        .environment(SavedStrainsStore.preview())
        .environment(RecentlyViewedStore.preview())
        .environment(SavedAilmentsStore.preview())
        .environment(ReliefLogStore.preview())
}

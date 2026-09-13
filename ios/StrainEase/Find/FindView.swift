import SwiftUI

struct FindView: View {
    @State private var model: FindModel
    @State private var path: [StrainProfile] = []
<<<<<<< HEAD
=======
    @FocusState private var focused: Field?
    @State private var didHydrateAilments = false
    @State private var didHydrateMedications = false
    @State private var didHydrateTriedStrains = false
    @State private var triedStrainsList: [TriedStrainItem] = []
    @State private var medicationsList: [String] = []
    @State private var showSavePrompt = false

    /// Identifies every text input on this screen so a single `@FocusState`
    /// can dismiss any of them. Without these bindings, SwiftUI wouldn't
    /// track focus on the form fields at all and the keyboard would stay
    /// up after tapping chips or buttons.
    enum Field: Hashable {
        case customAilment, patientNote, ownedStrains, medications
    }

>>>>>>> cad93b0 (feat(ios): swap Find/Browse tab labels+icons, drop 'Look up a strain')

    init(model: FindModel) {
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
                        filterRow("Commonly used for") { ailmentChips }
                        filterRow("THC") { thcChips }
                        // "Feels like" is the matching label used on the
                        // web directory so the effect vocabulary is the
                        // same across platforms.
                        filterRow("Feels like") { effectChips }
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
<<<<<<< HEAD
            .appChrome()
=======
            // Adds a "Done" button above the keyboard so users have a
            // discoverable way to dismiss focus without leaving the form.
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") {
                        focused = nil
                    }
                    .fontWeight(.semibold)
                    .foregroundStyle(Palette.primary)
                }
            }
>>>>>>> cad93b0 (feat(ios): swap Find/Browse tab labels+icons, drop 'Look up a strain')
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
            Text("Find popular strains")
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
            ForEach(FindFilter.TypeFilter.allCases) { option in
                SWChip(title: option.label, isOn: model.typeFilter == option) {
                    model.typeFilter = option
                }
            }
        }
    }

<<<<<<< HEAD
    private var thcChips: some View {
        FlowLayout(spacing: 8) {
            ForEach(FindFilter.ThcBand.allCases) { band in
                SWChip(title: band.label, isOn: model.thcBand == band) {
                    model.thcBand = band
=======
    private var potency: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionLabel("Potency", index: 2)
            FlowLayout(spacing: 8) {
                ForEach(Potency.allCases) { option in
                    SWChip(title: option.label, isOn: model.potency == option) {
                        model.potency = option
                    }
                }
            }
            Text(model.potency.hint)
                .font(.system(size: 12))
                .foregroundStyle(Palette.mutedForeground)
        }
    }

    private var prefs: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 10) {
                SectionLabel("When will you use it?", index: 3)
                FlowLayout(spacing: 8) {
                    ForEach(TimeOfDay.allCases) { option in
                        SWChip(title: option.label, isOn: model.prefs.timeOfDay == option) {
                            model.prefs.timeOfDay = option
                        }
                    }
                }
            }
            VStack(alignment: .leading, spacing: 10) {
                SectionLabel("Form", index: 4)
                FlowLayout(spacing: 8) {
                    ForEach(ConsumeForm.allCases) { option in
                        SWChip(title: option.label, isOn: model.prefs.consumeForm == option) {
                            model.prefs.consumeForm = option
                        }
                    }
                }
            }
            VStack(alignment: .leading, spacing: 10) {
                SectionLabel("THC sensitivity", index: 5)
                FlowLayout(spacing: 8) {
                    ForEach(ThcSensitivity.allCases) { option in
                        SWChip(title: option.label, isOn: model.prefs.thcSensitivity == option) {
                            model.prefs.thcSensitivity = option
                        }
                    }
                }
                if let hint = model.prefs.thcSensitivity.hint {
                    Text(hint)
                        .font(.system(size: 12))
                        .foregroundStyle(Palette.mutedForeground)
                }
            }
            SWField(
                title: "In your words (optional)",
                placeholder: "I need to sleep but I have to be up at 7…",
                text: $model.prefs.patientNote
            )
            .focused($focused, equals: .patientNote)

            // Tried strains with autocomplete
            VStack(alignment: .leading, spacing: 8) {
                SectionLabel("Other strains I've tried", index: 6)
                StrainAutocomplete(items: $triedStrainsList)
                Text("Help Kaya understand what has and hasn't worked for you.")
                    .font(.system(size: 12))
                    .foregroundStyle(Palette.mutedForeground)
            }

            // Medications with autocomplete
            VStack(alignment: .leading, spacing: 8) {
                SectionLabel("Other medications", index: 7)
                MedicationAutocomplete(items: $medicationsList, suggestions: savedMedications.names)
                Text("We never tell you to stop a prescription — only to check with your clinician.")
                    .font(.system(size: 12))
                    .foregroundStyle(Palette.mutedForeground)
            }
        }
        .onAppear {
            hydrateMedicationsIfNeeded()
            hydrateTriedStrainsIfNeeded()
        }
        .onChange(of: savedMedications.names) { _, _ in
            hydrateMedicationsIfNeeded()
        }
        .onChange(of: triedStrains.items) { _, _ in
            hydrateTriedStrainsIfNeeded()
        }
    }

    /// Prefill symptom chips from the saved account list once. Subsequent
    /// chip taps win — only runs when Find is still empty.
    private func hydrateAilmentsIfNeeded() {
        guard !didHydrateAilments else { return }
        if model.ailments.isEmpty, !savedAilments.ailments.isEmpty {
            model.applyAilments(savedAilments.ailments)
        }
        if !savedAilments.ailments.isEmpty || !model.ailments.isEmpty {
            didHydrateAilments = true
        }
    }

    private func applyPendingNavigation() {
        applyPendingAilments()
        applyPendingResearch()
    }

    private func applyPendingAilments() {
        let next = nav.consumeFindAilments()
        guard !next.isEmpty else { return }
        didHydrateAilments = true
        model.applyAilments(next, replace: true)
    }

    private func applyPendingResearch() {
        guard let restored = nav.consumeResearch() else { return }
        switch restored {
        case let .find(result, conditions):
            didHydrateAilments = true
            model.applyRestored(result: result, conditions: conditions)
        case let .compare(comparison):
            compareStore.applyRestored(comparison)
        }
    }

    /// Prefill prefs.medications from the saved profile list once. Subsequent
    /// edits win — only runs when the field is still empty.
    private func hydrateMedicationsIfNeeded() {
        guard !didHydrateMedications else { return }
        if medicationsList.isEmpty, !savedMedications.names.isEmpty {
            medicationsList = savedMedications.names
        }
        if !savedMedications.names.isEmpty || !medicationsList.isEmpty {
            didHydrateMedications = true
        }
    }

    /// Prefill triedStrainsList from the saved profile list once. Subsequent
    /// edits win — only runs when the list is still empty.
    private func hydrateTriedStrainsIfNeeded() {
        guard !didHydrateTriedStrains else { return }
        if triedStrainsList.isEmpty, !triedStrains.items.isEmpty {
            triedStrainsList = triedStrains.items
        }
        if !triedStrains.items.isEmpty || !triedStrainsList.isEmpty {
            didHydrateTriedStrains = true
        }
    }

    /// Check if tried strains or medications differ from saved profile.
    private var hasUnsavedChanges: Bool {
        let savedTriedStrainsNames = Set(triedStrains.items.map { $0.name.lowercased() })
        let currentTriedStrainsNames = Set(triedStrainsList.map { $0.name.lowercased() })
        let triedStrainsDiffer = triedStrainsList.count != triedStrains.items.count ||
            !currentTriedStrainsNames.isSubset(of: savedTriedStrainsNames)

        let savedMedsNames = Set(savedMedications.names.map { $0.lowercased() })
        let currentMedsNames = Set(medicationsList.map { $0.lowercased() })
        let medsDiffer = medicationsList.count != savedMedications.names.count ||
            !currentMedsNames.isSubset(of: savedMedsNames)

        return triedStrainsDiffer || medsDiffer
    }

    /// Save tried strains and medications to profile.
    private func saveToProfile() async {
        // Sync tried strains
        let savedTriedStrainsNames = Set(triedStrains.items.map { $0.name.lowercased() })
        for strain in triedStrainsList {
            if !savedTriedStrainsNames.contains(strain.name.lowercased()) {
                await triedStrains.add(strain)
            }
        }
        for strain in triedStrains.items {
            if !triedStrainsList.contains(where: { $0.name.lowercased() == strain.name.lowercased() }) {
                await triedStrains.remove(strain)
            }
        }
        // Sync medications
        let savedMedsNames = Set(savedMedications.names.map { $0.lowercased() })
        for med in medicationsList {
            if !savedMedsNames.contains(med.lowercased()) {
                await savedMedications.add(med)
            }
        }
        for med in savedMedications.items {
            if !medicationsList.contains(where: { $0.lowercased() == med.name.lowercased() }) {
                await savedMedications.remove(med)
            }
        }
    }

    private var compareTray: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .firstTextBaseline) {
                SectionLabel("Compare strains")
                Spacer(minLength: 0)
                Text("\(compareStore.count)/3 selected")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Palette.mutedForeground)
                    .accessibilityIdentifier("find.compare.count")
            }
            Text("Pick up to three strains to compare side by side. Tap a chip below to remove it.")
                .font(.system(size: 13))
                .foregroundStyle(Palette.mutedForeground)
                .fixedSize(horizontal: false, vertical: true)
            if !compareStore.names.isEmpty {
                FlowLayout(spacing: 8) {
                    ForEach(compareStore.names, id: \.self) { name in
                        CompareChip(name: name) {
                            compareStore.remove(name)
                        }
                    }
                }
                if compareStore.names.count >= 2 {
                    Button {
                        compareStore.clear()
                    } label: {
                        Text("Clear all")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Palette.mutedForeground)
                    }
                    .buttonStyle(.plain)
                }
            }
            let canRun = compareStore.canRunCompare && !compareStore.isComparing
            SWPrimaryButton(
                title: compareStore.isComparing
                    ? "Comparing…"
                    : (canRun ? "Compare \(compareStore.count) strains" : "Add 2 strains to compare"),
                systemImage: "arrow.left.arrow.right",
                isBusy: compareStore.isComparing
            ) {
                Task {
                    await compareStore.runCompare(
                        api: api,
                        conditions: model.ailments,
                        prefs: model.prefs,
                        reliefSummary: relief.summary.isEmpty ? nil : relief.summary
                    )
                    if let comparison = compareStore.comparison {
                        await history.remember(
                            compare: comparison,
                            names: compareStore.names,
                            conditions: model.ailments
                        )
                    }
                }
            }
            .disabled(!canRun)
            .opacity(canRun || compareStore.isComparing ? 1 : 0.55)
            if let error = compareStore.compareError {
                SWErrorBanner(message: error)
            }
        }
    }

    private func compareList(_ title: String, _ items: [String]) -> some View {
        Group {
            if !items.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    SectionLabel(title)
                    SWCard {
                        VStack(alignment: .leading, spacing: 8) {
                            ForEach(items, id: \.self) { item in
                                Text(item)
                                    .font(.system(size: 14))
                                    .foregroundStyle(Palette.foreground)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                    }
>>>>>>> cad93b0 (feat(ios): swap Find/Browse tab labels+icons, drop 'Look up a strain')
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
            ForEach(FindFilter.EffectBucket.all) { bucket in
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
                                .compareHoldable(profile.name)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }
<<<<<<< HEAD
=======

    private func errorBanner(_ text: String) -> some View {
        SWErrorBanner(message: text)
    }
>>>>>>> cad93b0 (feat(ios): swap Find/Browse tab labels+icons, drop 'Look up a strain')
}

#Preview("Find") {
    FindView(model: FindModel(api: PreviewStrainAPI()))
        .environment(\.strainAPI, PreviewStrainAPI())
        .environment(AppNavigation())
        .environment(AuthSession.previewSignedIn)
        .environment(SavedStrainsStore.preview())
        .environment(RecentlyViewedStore.preview())
        .environment(SavedAilmentsStore.preview())
        .environment(ReliefLogStore.preview())
        .environment(CompareSelectionStore())
}

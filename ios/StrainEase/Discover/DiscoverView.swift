import SwiftUI

struct DiscoverView: View {
    @Environment(SavedAilmentsStore.self) private var savedAilments
    @Environment(SavedMedicationsStore.self) private var savedMedications
    @Environment(TriedStrainsStore.self) private var triedStrains
    @Environment(ReliefLogStore.self) private var relief
    @Environment(\.strainAPI) private var api
    @Environment(CompareSelectionStore.self) private var compareStore
    @Environment(AppNavigation.self) private var nav
    @Environment(ResearchHistoryStore.self) private var history

    @State private var model: DiscoverModel
    @State private var path: [StrainProfile] = []
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


    init(model: DiscoverModel) {
        _model = State(initialValue: model)
    }

    var body: some View {
        NavigationStack(path: $path) {
            ZStack {
                MeshBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: 28) {
                        hero
                        if let hint = relief.tonightHint {
                            SWCard {
                                Text(hint)
                                    .font(.system(size: 14))
                                    .foregroundStyle(Palette.foreground)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                        conditions
                        potency
                        prefs
                        compareTray
                        findButton
                        if let error = model.errorMessage {
                            errorBanner(error)
                        }
                        if let result = model.result {
                            results(result)
                                .id(result.headline)
                                .transition(.opacity.combined(with: .move(edge: .bottom)))
                        }
                        if let comparison = compareStore.comparison {
                            CompareResultsView(comparison: comparison) { path.append($0) }
                                .id(comparison.resultId ?? comparison.analysis.headline)
                                .transition(.opacity.combined(with: .move(edge: .bottom)))
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 24)
                    // Tap anywhere on the form's background to dismiss the
                    // keyboard. We use `.simultaneousGesture` rather than
                    // `.onTapGesture` so the dismiss-keyboard gesture never
                    // shadows child Button taps: with `.contentShape(...)`,
                    // a plain `.onTapGesture` on the parent absorbs hits
                    // across the whole rectangle and silently disables the
                    // Compare CTA (and any other button) inside the form.
                    // `.simultaneousGesture` lets the button fire first
                    // while still dismissing focus on taps in empty space.
                    .contentShape(Rectangle())
                    .simultaneousGesture(TapGesture().onEnded {
                        focused = nil
                    })
                }
                .scrollDismissesKeyboard(.interactively)
            }
            .navigationTitle("Discover")
            .navigationBarTitleDisplayMode(.inline)
            .appChrome()
            .toolbarBackground(.hidden, for: .navigationBar)
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
            .navigationDestination(for: StrainProfile.self) { profile in
                StrainDetailView(profile: profile)
            }
            .onAppear {
                hydrateAilmentsIfNeeded()
                applyPendingNavigation()
            }
            .onChange(of: savedAilments.ailments) { _, _ in
                hydrateAilmentsIfNeeded()
            }
            .onChange(of: nav.pendingFindAilments) { _, _ in
                applyPendingAilments()
            }
            .onChange(of: nav.pendingResearch) { _, _ in
                applyPendingResearch()
            }
        }
        .tint(Palette.primary)
        .animation(.snappy(duration: 0.35), value: model.isRunning)
        .animation(.snappy(duration: 0.4), value: model.result?.headline)
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 10) {
            Eyebrow(text: "Patient research")
            Text("What are we treating?")
                .font(.system(.largeTitle, design: .serif).weight(.regular))
                .foregroundStyle(Palette.foreground)
            Text("Pick symptoms, set the night you need, and we’ll rank strains patients actually report.")
                .font(.system(size: 16))
                .foregroundStyle(Palette.mutedForeground)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var conditions: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Same chip list, same label as FindView's ailment
            // row — so the user's vocabulary matches when they hop
            // between the Find and Discover tabs.
            SectionLabel("Commonly used for", index: 1)
            FlowLayout(spacing: 8) {
                ForEach(Conditions.catalog, id: \.self) { name in
                    SWChip(title: name, isOn: model.isSelected(name)) {
                        model.toggleAilment(name)
                    }
                }
            }
            HStack(spacing: 8) {
                TextField("Or type any symptom", text: $model.customAilment)
                    .focused($focused, equals: .customAilment)
                    .submitLabel(.done)
                    .textInputAutocapitalization(.sentences)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 11)
                    .background(Palette.card, in: Capsule())
                    .overlay(Capsule().strokeBorder(Palette.border, lineWidth: 1))
                    .onSubmit {
                        model.addCustomAilment()
                        focused = nil
                    }
                Button {
                    model.addCustomAilment()
                    focused = nil
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Palette.primaryForeground)
                        .frame(width: 40, height: 40)
                        .background(Palette.primary, in: Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Add symptom")
            }
            if !model.ailments.filter({ name in !Conditions.catalog.contains(where: { $0.caseInsensitiveCompare(name) == .orderedSame }) }).isEmpty {
                FlowLayout(spacing: 8) {
                    ForEach(model.ailments.filter { name in
                        !Conditions.catalog.contains { $0.caseInsensitiveCompare(name) == .orderedSame }
                    }, id: \.self) { name in
                        SWChip(title: name, isOn: true) {
                            model.toggleAilment(name)
                        }
                    }
                }
            }
        }
    }

    private var potency: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Matches the Find tab's "THC" section header so the
            // same chip strip reads the same on both surfaces.
            SectionLabel("THC", index: 2)
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
                }
            }
        }
    }


    private var findButton: some View {
        VStack(spacing: 12) {
            // Save prompt
            if showSavePrompt && hasUnsavedChanges {
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Save your tried strains and medications?")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Palette.foreground)
                        Text("You added tried strains or medications here. Save them to your profile so they auto-fill on future searches.")
                            .font(.system(size: 12))
                            .foregroundStyle(Palette.mutedForeground)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    HStack(spacing: 8) {
                        Button("Skip") {
                            showSavePrompt = false
                        }
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Palette.mutedForeground)
                        Button("Save") {
                            Task {
                                await saveToProfile()
                                showSavePrompt = false
                            }
                        }
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Palette.primaryForeground)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Palette.primary, in: Capsule())
                    }
                }
                .padding(16)
                .background(Palette.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(Palette.primary.opacity(0.25), lineWidth: 1)
                )
            }

            SWPrimaryButton(
                title: model.isRunning
                    ? model.step.rawValue
                    : (model.canFind ? "Find best strains" : "Pick a symptom first"),
                systemImage: "sparkles",
                isBusy: model.isRunning
            ) {
                focused = nil
                Task {
                    await model.find(reliefSummary: relief.summary.isEmpty ? nil : relief.summary)
                    if let result = model.result {
                        await history.remember(find: result, conditions: model.searched)
                        // Show save prompt if there are unsaved changes
                        if hasUnsavedChanges {
                            showSavePrompt = true
                        }
                    }
                }
            }
            .disabled(!model.canFind)
            .opacity(model.canFind || model.isRunning ? 1 : 0.55)
            .sensoryFeedback(.impact(weight: .medium), trigger: model.isRunning)
        }
    }

    private func results(_ result: RecommendationResult) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                SectionLabel("For \(model.searched.joined(separator: ", "))")
                Text(result.headline)
                    .font(.system(.title, design: .serif))
                    .foregroundStyle(Palette.foreground)
                    .fixedSize(horizontal: false, vertical: true)
                // Split summary into paragraphs for better readability
                let paragraphs = result.summary.components(separatedBy: "\n\n").filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
                VStack(alignment: .leading, spacing: 12) {
                    ForEach(Array(paragraphs.enumerated()), id: \.offset) { _, paragraph in
                        Text(paragraph.trimmingCharacters(in: .whitespaces))
                            .font(.system(size: 15))
                            .foregroundStyle(Palette.mutedForeground)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }

            // Horizontal scroll strain cards section
            StrainCardsSection(
                recommendations: Array(result.recommendations.prefix(6)),
                profilesByName: result,
                onAddToCompare: { name in model.toggleCompare(name) },
                isInCompare: { model.isInCompare($0) },
                compareAtCap: model.compareAtCap,
                onTapStrain: { profile in path.append(profile) }
            )

            // Disclaimer above compare card
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: "sparkles")
                    .font(.system(size: 12))
                    .foregroundStyle(Palette.primary)
                Text("Recommendations by Dr. Kaya, our AI cannabis care assistant. Synthesized from aggregated public sources. Not medical advice. Consult your healthcare provider.")
                    .font(.system(size: 12))
                    .foregroundStyle(Palette.mutedForeground)
                    .fixedSize(horizontal: false, vertical: true)
            }

            // Compare card - full width with stacked layout
            VStack(alignment: .leading, spacing: 12) {
                Text("Narrowed it down?")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Palette.foreground)
                Text("Turn your top picks into a full side-by-side comparison with differences, common ground, and cautions.")
                    .font(.system(size: 12))
                    .foregroundStyle(Palette.mutedForeground)
                    .fixedSize(horizontal: false, vertical: true)
                if result.recommendations.count < 2 {
                    Text("Add at least two recommendations to compare — or use the compare tab to pick your own strains.")
                        .font(.system(size: 12))
                        .foregroundStyle(Palette.mutedForeground)
                } else {
                    Button {
                        let topNames = result.recommendations.prefix(3).map(\.strainName)
                        for name in topNames {
                            model.addToCompare(name)
                        }
                        Task {
                            await model.compareSelected()
                        }
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "arrow.left.arrow.right")
                                .font(.system(size: 13, weight: .semibold))
                            Text("Compare the top picks")
                                .font(.system(size: 14, weight: .semibold))
                        }
                        .foregroundStyle(Palette.primaryForeground)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Palette.primary, in: Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }

            ForEach(Array(result.recommendations.enumerated()), id: \.element.id) { index, rec in
                let profile = result.profile(named: rec.strainName)
                    ?? StrainProfile(name: rec.strainName, inKnowledgeBase: false)
                Button {
                    path.append(profile)
                } label: {
                    recommendationCard(rec, rank: index + 1, profile: profile)
                        .compareHoldable(rec.strainName)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.primary.opacity(0.06), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .strokeBorder(Palette.primary.opacity(0.2), lineWidth: 1)
            )

            RedditThreadsView(sources: result.redditSources ?? [])

            Button("Start over", action: model.reset)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(Palette.mutedForeground)
                .frame(maxWidth: .infinity)
                .padding(.top, 4)
        }
    }

    @ViewBuilder
    private func compareButton(for name: String) -> some View {
        let added = model.isInCompare(name)
        let disabled = !added && model.compareAtCap
        Button {
            model.toggleCompare(name)
        } label: {
            HStack(spacing: 6) {
                Image(systemName: added ? "checkmark" : "arrow.left.arrow.right")
                    .font(.system(size: 12, weight: .semibold))
                Text(added ? "Added to compare" : "Add to compare")
                    .font(.system(size: 13, weight: .semibold))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .foregroundStyle(added ? Palette.primary : Palette.foreground)
            .background(
                added ? Palette.primary.opacity(0.12) : Palette.card,
                in: Capsule()
            )
            .overlay(
                Capsule().strokeBorder(
                    added ? Palette.primary.opacity(0.4) : Palette.border,
                    lineWidth: 1
                )
            )
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .opacity(disabled ? 0.45 : 1)
        .accessibilityLabel(added ? "Remove from compare selection" : "Add to compare selection")
        .accessibilityHint(disabled ? "Compare is full (3 strains)" : "Researching only — pick strains here, run the comparison when you're ready")
    }

    private func labeled(_ title: String, _ body: String) -> some View {
        Group {
            if !body.isEmpty {
                Text("\(title)  ")
                    .foregroundStyle(Palette.mutedForeground)
                    .font(.system(size: 13, weight: .semibold))
                + Text(body)
                    .foregroundStyle(Palette.mutedForeground)
                    .font(.system(size: 13))
            }
        }
    }

    private func errorBanner(_ text: String) -> some View {
        SWErrorBanner(message: text)
    }
}

/// Horizontal scroll section of strain cards with rich recommendation info.
/// Combines photo, strain info, and Add to compare functionality in ONE card per strain.
struct StrainCardsSection: View {
    let recommendations: [StrainRecommendation]
    let profilesByName: RecommendationResult
    let onAddToCompare: (String) -> Void
    let isInCompare: (String) -> Bool
    let compareAtCap: Bool
    let onTapStrain: (StrainProfile) -> Void

    /// Identifies the active card for `scrollPosition(id:)`. The id is the
    /// recommendation's index in the section's prefix list — SwiftUI uses
    /// it as the snap target for `.scrollTargetBehavior(.viewAligned)`
    /// and as the read/write handle that keeps the dot indicator and the
    /// actual scroll position in sync. Optional because
    /// `scrollPosition(id:)` requires a `Binding<some Hashable?>`; nil
    /// means "no card snapped yet" (initial state).
    @State private var activeId: Int? = 0

    private var cardWidth: CGFloat {
        // 85% of screen width for mobile, fixed for larger
        UIScreen.main.bounds.width * 0.85
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Section header
            Text("Tap a strain for details")
                .font(.system(size: 11, weight: .semibold))
                .tracking(1.2)
                .foregroundStyle(Palette.mutedForeground)

            // Horizontal scroll with snap. Side padding puts the first and
            // last card flush with the page margin so the snap target is
            // the card edge, not its center.
            GeometryReader { proxy in
                let sidePadding = max(0, (proxy.size.width - cardWidth) / 2)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 16) {
                        ForEach(Array(recommendations.enumerated()), id: \.element.id) { index, rec in
                            let profile = profilesByName.profile(named: rec.strainName)
                                ?? StrainProfile(name: rec.strainName, inKnowledgeBase: false)

                            StrainRecommendationCard(
                                recommendation: rec,
                                profile: profile,
                                rank: index + 1,
                                isAdded: isInCompare(rec.strainName),
                                disabled: !isInCompare(rec.strainName) && compareAtCap,
                                onAddToCompare: { onAddToCompare(rec.strainName) },
                                onTap: { onTapStrain(profile) }
                            )
                            .frame(width: cardWidth)
                            .id(index)
                        }
                    }
                    .scrollTargetLayout()
                    .padding(.horizontal, sidePadding)
                }
                .scrollTargetBehavior(.viewAligned)
                .scrollPosition(id: $activeId)
            }
            .frame(height: 380)

            // Indicator dots
            if recommendations.count > 1 {
                HStack(spacing: 8) {
                    ForEach(0..<recommendations.count, id: \.self) { index in
                        let isActive = activeId == index
                        Button {
                            withAnimation(.easeInOut(duration: 0.25)) {
                                activeId = index
                            }
                        } label: {
                            Capsule()
                                .fill(isActive ? Palette.primary : Palette.primary.opacity(0.3))
                                .frame(width: isActive ? 20 : 8, height: 8)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Show recommendation \(index + 1)")
                    }
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, -20)
    }
}

/// Individual strain recommendation card with photo, info, and compare button.
struct StrainRecommendationCard: View {
    let recommendation: StrainRecommendation
    let profile: StrainProfile
    let rank: Int
    let isAdded: Bool
    let disabled: Bool
    let onAddToCompare: () -> Void
    let onTap: () -> Void

    @Environment(SavedStrainsStore.self) private var savedStrains

    private var noteCount: Int {
        savedStrains.notes(for: profile.slug).count
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Card content
            VStack(alignment: .leading, spacing: 10) {
                // Rank badge (absolute positioned)
                ZStack(alignment: .topLeading) {
                    // Photo
                    Button(action: onTap) {
                        StrainPhoto(
                            urlString: profile.imageUrl,
                            fallbackURLString: StrainCatalog.photoURL(for: profile.slug),
                            type: profile.type,
                            height: 128,
                            cornerRadius: 16
                        )
                    }
                    .buttonStyle(.plain)

                    // Rank badge
                    Text(String(format: "%d", rank))
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Palette.primary)
                        .frame(width: 24, height: 24)
                        .background(Palette.primary.opacity(0.1), in: Circle())
                        .padding(12)
                }

                // Strain name - clickable
                Button(action: onTap) {
                    HStack(spacing: 4) {
                        Text(recommendation.strainName)
                            .font(.system(size: 14, weight: .semibold, design: .serif))
                            .foregroundStyle(Palette.foreground)
                        if noteCount > 0 {
                            Image(systemName: "square.and.pencil")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundStyle(Palette.primary)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 2)
                                .background(Palette.accent.opacity(0.85), in: Capsule())
                        }
                    }
                }
                .buttonStyle(.plain)

                // THC, CBD, Type badges
                HStack(spacing: 6) {
                    if let thc = profile.thcRange, !thc.isEmpty {
                        Text("THC \(thc)")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(Palette.primary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Palette.primary.opacity(0.08), in: Capsule())
                    }
                    if let cbd = profile.cbdRange, !cbd.isEmpty {
                        Text("CBD \(cbd)")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.green)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color.green.opacity(0.08), in: Capsule())
                    }
                    if let type = profile.type {
                        TypeBadge(type: type)
                    }
                }

                // Best for
                if !recommendation.bestFor.isEmpty {
                    Text("Best for: \(recommendation.bestFor)")
                        .font(.system(size: 11))
                        .foregroundStyle(Palette.mutedForeground)
                        .lineLimit(2)
                }

                // Caution
                if !recommendation.caution.isEmpty {
                    Text("Caution: \(recommendation.caution)")
                        .font(.system(size: 11))
                        .foregroundStyle(.orange)
                        .lineLimit(2)
                }

                // Reason snippet
                if !recommendation.reason.isEmpty {
                    Text(recommendation.reason)
                        .font(.system(size: 11))
                        .foregroundStyle(Palette.mutedForeground)
                        .lineLimit(2)
                }

                // Matched preferences from reasoning
                if let prefs = recommendation.reasoning?.preferencesApplied, !prefs.isEmpty {
                    HStack(spacing: 4) {
                        ForEach(prefs.prefix(2), id: \.self) { pref in
                            Text(pref)
                                .font(.system(size: 9, weight: .medium))
                                .foregroundStyle(.orange)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.orange.opacity(0.08), in: Capsule())
                        }
                        if prefs.count > 2 {
                            Text("+\(prefs.count - 2)")
                                .font(.system(size: 9))
                                .foregroundStyle(Palette.mutedForeground)
                        }
                    }
                }

                Spacer(minLength: 0)

                // Add to compare button
                Button(action: onAddToCompare) {
                    HStack(spacing: 6) {
                        Image(systemName: isAdded ? "checkmark" : "arrow.left.arrow.right")
                            .font(.system(size: 11, weight: .semibold))
                        Text(isAdded ? "Added" : "Compare")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundStyle(isAdded ? Palette.primary : Palette.foreground)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(isAdded ? Palette.primary.opacity(0.12) : Palette.card, in: Capsule())
                    .overlay(
                        Capsule().strokeBorder(
                            isAdded ? Palette.primary.opacity(0.4) : Palette.border,
                            lineWidth: 1
                        )
                    )
                }
                .buttonStyle(.plain)
                .disabled(disabled)
                .opacity(disabled ? 0.45 : 1)
            }
            .padding(14)
        }
        .background(Palette.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .strokeBorder(Palette.border.opacity(0.7), lineWidth: 1)
        )
    }
}

#Preview("Empty") {
    DiscoverView(model: .previewEmpty)
        .environment(\.strainAPI, PreviewStrainAPI())
        .environment(AppNavigation())
        .environment(AuthSession.previewSignedIn)
        .environment(SavedStrainsStore.preview())
        .environment(SavedAilmentsStore.preview())
        .environment(SavedMedicationsStore.preview(["Lexapro"]))
        .environment(TriedStrainsStore.preview())

        .environment(RecentlyViewedStore.preview())
        .environment(ReliefLogStore.preview([.sampleSleep]))
        .environment(CompareSelectionStore())
        .environment(ResearchHistoryStore.preview())
}

#Preview("Results · Dark") {
    DiscoverView(model: .previewFilled)
        .environment(\.strainAPI, PreviewStrainAPI())
        .environment(AppNavigation())
        .environment(AuthSession.previewSignedIn)
        .environment(SavedStrainsStore.preview(["granddaddy-purple"]))
        .environment(SavedAilmentsStore.preview(["Insomnia"]))
        .environment(SavedMedicationsStore.preview(["Lexapro", "Ibuprofen"]))
        .environment(TriedStrainsStore.preview(["Blue Dream"]))

        .environment(RecentlyViewedStore.preview())
        .environment(ReliefLogStore.preview())
        .environment(CompareSelectionStore())
        .environment(ResearchHistoryStore.preview())
        .preferredColorScheme(.dark)
}

private struct CompareChip: View {
    let name: String
    var onRemove: () -> Void

    var body: some View {
        HStack(spacing: 6) {
            Text(name)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Palette.primaryForeground)
                .lineLimit(1)
            NoteBadge(profile: StrainProfile(name: name, inKnowledgeBase: false), size: 12, compact: true)
            Button(action: onRemove) {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Palette.primaryForeground.opacity(0.85))
                    .padding(4)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Remove \(name) from comparison")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Palette.primary, in: Capsule())
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("find.compare.chip.\(name)")
    }
}

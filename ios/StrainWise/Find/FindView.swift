import SwiftUI

struct FindView: View {
    @Environment(SavedAilmentsStore.self) private var savedAilments
    @Environment(SavedMedicationsStore.self) private var savedMedications
    @Environment(ReliefLogStore.self) private var relief
    @Environment(\.strainAPI) private var api
    @Environment(CompareSelectionStore.self) private var compareStore
    @Environment(AppNavigation.self) private var nav
    @Environment(ResearchHistoryStore.self) private var history

    @State private var model: FindModel
    @State private var path: [StrainProfile] = []
    @FocusState private var focused: Field?
    @State private var didHydrateAilments = false
    @State private var didHydrateMedications = false

    /// Identifies every text input on this screen so a single `@FocusState`
    /// can dismiss any of them. Without these bindings, SwiftUI wouldn't
    /// track focus on the form fields at all and the keyboard would stay
    /// up after tapping chips or buttons.
    enum Field: Hashable {
        case customAilment, patientNote, ownedStrains, medications, lookup
    }


    init(model: FindModel) {
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
                        if model.isRunning {
                            running
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
            .navigationTitle("Find")
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
            .safeAreaInset(edge: .bottom, spacing: 0) {
                searchBar
            }
            .overlay(alignment: .top) {
                if let lookupError = model.lookupError {
                    Text(lookupError)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Palette.destructive)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(Palette.card, in: Capsule())
                        .overlay(Capsule().strokeBorder(Palette.border, lineWidth: 1))
                        .padding(.top, 8)
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
            SectionLabel("Symptoms", index: 1)
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
            SWField(
                title: "Already have",
                placeholder: "Blue Dream, Gelato",
                text: $model.prefs.ownedStrainsText
            )
            .focused($focused, equals: .ownedStrains)
            VStack(alignment: .leading, spacing: 6) {
                SWField(
                    title: "Other meds",
                    placeholder: "Medication we should be careful around",
                    text: $model.prefs.medications
                )
                .focused($focused, equals: .medications)
                Text("We never tell you to stop a prescription — only to check with your clinician.")
                    .font(.system(size: 12))
                    .foregroundStyle(Palette.mutedForeground)
            }
        }
        .onAppear { hydrateMedicationsIfNeeded() }
        .onChange(of: savedMedications.names) { _, _ in
            hydrateMedicationsIfNeeded()
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
        if model.prefs.medications.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
           !savedMedications.names.isEmpty {
            model.prefs.medications = savedMedications.names.joined(separator: ", ")
        }
        if !savedMedications.names.isEmpty || !model.prefs.medications.isEmpty {
            didHydrateMedications = true
        }
    }

    private var searchBar: some View {
        HStack(spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Palette.mutedForeground)
                    .accessibilityHidden(true)
                TextField("Look up a strain", text: $model.lookupQuery)
                    .focused($focused, equals: .lookup)
                    .textInputAutocapitalization(.words)
                    .autocorrectionDisabled()
                    .submitLabel(.search)
                    .onSubmit { Task { await lookup() } }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 11)
            .background(Palette.card, in: Capsule())
            .overlay(Capsule().strokeBorder(Palette.border, lineWidth: 1))

            Button {
                Task { await lookup() }
                focused = nil
            } label: {
                Group {
                    if model.isLookingUp {
                        ProgressView()
                            .tint(Palette.primaryForeground)
                    } else {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 15, weight: .semibold))
                    }
                }
                .foregroundStyle(Palette.primaryForeground)
                .frame(width: 44, height: 44)
                .background(Palette.primary, in: Circle())
            }
            .buttonStyle(.plain)
            .disabled(!model.canLookup)
            .opacity(model.canLookup || model.isLookingUp ? 1 : 0.45)
            .accessibilityLabel("Search")
        }
        .padding(.horizontal, 20)
        .padding(.top, 10)
        .padding(.bottom, 8)
        .background(Palette.background.opacity(0.94))
        .overlay(alignment: .top) {
            Rectangle()
                .fill(Palette.border)
                .frame(height: 1)
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
        SWPrimaryButton(
            title: model.canFind || model.isRunning ? "Find strains" : "Pick a symptom first",
            systemImage: "sparkles",
            isBusy: model.isRunning
        ) {
            focused = nil
            Task {
                await model.find(reliefSummary: relief.summary.isEmpty ? nil : relief.summary)
                if let result = model.result {
                    await history.remember(find: result, conditions: model.searched)
                }
            }
        }
        .disabled(!model.canFind)
        .opacity(model.canFind || model.isRunning ? 1 : 0.55)
        .sensoryFeedback(.impact(weight: .medium), trigger: model.isRunning)
    }

    private var running: some View {
        SWCard {
            HStack(alignment: .top, spacing: 12) {
                ProgressView()
                    .tint(Palette.primary)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Researching")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Palette.foreground)
                    Text(model.step.rawValue)
                        .font(.system(size: 13))
                        .foregroundStyle(Palette.mutedForeground)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
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
                Text(result.summary)
                    .font(.system(size: 15))
                    .foregroundStyle(Palette.mutedForeground)
                    .fixedSize(horizontal: false, vertical: true)
            }

            ForEach(Array(result.recommendations.enumerated()), id: \.element.id) { index, rec in
                let profile = result.profile(named: rec.strainName)
                    ?? StrainProfile(name: rec.strainName, inKnowledgeBase: false)
                Button {
                    path.append(profile)
                } label: {
                    recommendationCard(rec, rank: index + 1, profile: profile)
                }
                .buttonStyle(.plain)
            }

            RedditThreadsView(sources: result.redditSources ?? [])

            Button("Start over", action: model.reset)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(Palette.mutedForeground)
                .frame(maxWidth: .infinity)
                .padding(.top, 4)
        }
    }

    private func recommendationCard(_ rec: StrainRecommendation, rank: Int, profile: StrainProfile) -> some View {
        SWCard(emphasized: rank == 1) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .firstTextBaseline) {
                    Text(String(format: "%02d", rank))
                        .font(.system(size: 12, weight: .semibold, design: .monospaced))
                        .foregroundStyle(Palette.primary)
                    Text(rec.strainName)
                        .font(.system(.title3, design: .serif))
                        .foregroundStyle(Palette.foreground)
                    Spacer(minLength: 8)
                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Palette.mutedForeground)
                        .frame(width: 28, height: 28)
                        .background(Palette.muted, in: Circle())
                }
                if let type = profile.type {
                    TypeBadge(type: type)
                }
                compareButton(for: rec.strainName)
                Text(rec.reason)
                    .font(.system(size: 14))
                    .foregroundStyle(Palette.foreground.opacity(0.88))
                    .fixedSize(horizontal: false, vertical: true)
                VStack(alignment: .leading, spacing: 4) {
                    labeled("Best for", rec.bestFor)
                    labeled("Caution", rec.caution)
                }
            }
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

    private func lookup() async {
        guard model.canLookup else { return }
        if let profile = await model.lookup() {
            focused = nil
            path.append(profile)
        }
    }
}

#Preview("Empty") {
    FindView(model: .previewEmpty)
        .environment(\.strainAPI, PreviewStrainAPI())
        .environment(AppNavigation())
        .environment(AuthSession.previewSignedIn)
        .environment(SavedStrainsStore.preview())
        .environment(SavedAilmentsStore.preview())
        .environment(SavedMedicationsStore.preview(["Lexapro"]))

        .environment(RecentlyViewedStore.preview())
        .environment(ReliefLogStore.preview([.sampleSleep]))
        .environment(CompareSelectionStore())
        .environment(ResearchHistoryStore.preview())
}

#Preview("Results · Dark") {
    FindView(model: .previewFilled)
        .environment(\.strainAPI, PreviewStrainAPI())
        .environment(AppNavigation())
        .environment(AuthSession.previewSignedIn)
        .environment(SavedStrainsStore.preview(["granddaddy-purple"]))
        .environment(SavedAilmentsStore.preview(["Insomnia"]))
        .environment(SavedMedicationsStore.preview(["Lexapro", "Ibuprofen"]))

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

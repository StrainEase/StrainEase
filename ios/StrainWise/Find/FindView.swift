import SwiftUI

struct FindView: View {
    @Environment(SavedAilmentsStore.self) private var savedAilments
    @Environment(SavedMedicationsStore.self) private var savedMedications
    @Environment(ReliefLogStore.self) private var relief

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
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 24)
                    // Tap anywhere on the form's background to dismiss the
                    // keyboard. Buttons consume their own taps so this only
                    // fires for taps on empty/label areas.
                    .contentShape(Rectangle())
                    .onTapGesture {
                        focused = nil
                    }
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
                Text("\(model.compareNames.count)/3 selected")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Palette.mutedForeground)
                    .accessibilityIdentifier("find.compare.count")
            }
            Text("Pick up to three strains to compare side by side. Tap a chip below to remove it.")
                .font(.system(size: 13))
                .foregroundStyle(Palette.mutedForeground)
                .fixedSize(horizontal: false, vertical: true)
            if !model.compareNames.isEmpty {
                FlowLayout(spacing: 8) {
                    ForEach(model.compareNames, id: \.self) { name in
                        CompareChip(name: name) {
                            model.removeFromCompare(name)
                        }
                    }
                }
                if model.compareNames.count >= 2 {
                    Button {
                        model.removeFromCompare(model.compareNames[0])
                    } label: {
                        Text("Clear all")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Palette.mutedForeground)
                    }
                    .buttonStyle(.plain)
                }
            }
            SWPrimaryButton(
                title: model.isComparing
                    ? "Comparing…"
                    : (model.canCompare ? "Compare \(model.compareNames.count) strains" : "Add 2 strains to compare"),
                systemImage: "arrow.left.arrow.right",
                isBusy: model.isComparing
            ) {
                Task { await model.compareSelected(reliefSummary: relief.summary.isEmpty ? nil : relief.summary) }
            }
            .disabled(!model.canCompare)
            .opacity(model.canCompare || model.isComparing ? 1 : 0.55)
        }
    }

    private func compareResults(_ comparison: StrainComparison) -> some View {
        let analysis = comparison.analysis
        return VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                SectionLabel("Comparison")
                Text(analysis.headline)
                    .font(.system(.title, design: .serif))
                    .foregroundStyle(Palette.foreground)
                    .fixedSize(horizontal: false, vertical: true)
                Text(analysis.summary)
                    .font(.system(size: 15))
                    .foregroundStyle(Palette.mutedForeground)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if let pick = analysis.forCondition {
                SWCard {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Best for your symptoms")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Palette.primary)
                        Text(pick.best)
                            .font(.system(.title3, design: .serif))
                        Text(pick.why)
                            .font(.system(size: 14))
                            .foregroundStyle(Palette.mutedForeground)
                        if !pick.runnerUp.isEmpty {
                            Text("Runner-up: \(pick.runnerUp)")
                                .font(.system(size: 13))
                                .foregroundStyle(Palette.mutedForeground)
                        }
                    }
                }
            }
            compareList("Key differences", analysis.keyDifferences)
            compareList("Common ground", analysis.commonGround)
            compareList("Cautions", analysis.cautions)
            ForEach(comparison.strains) { profile in
                Button {
                    path.append(profile)
                } label: {
                    SWCard {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(profile.name)
                                    .font(.system(.title3, design: .serif))
                                    .foregroundStyle(Palette.foreground)
                                if !profile.subtitle.isEmpty {
                                    Text(profile.subtitle)
                                        .font(.system(size: 13))
                                        .foregroundStyle(Palette.mutedForeground)
                                }
                            }
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .foregroundStyle(Palette.mutedForeground)
                        }
                    }
                }
                .buttonStyle(.plain)
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
            Task { await model.find(reliefSummary: relief.summary.isEmpty ? nil : relief.summary) }
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
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Palette.destructive)
            Text(text)
                .font(.system(size: 14))
                .foregroundStyle(Palette.foreground)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.destructive.opacity(0.08), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(Palette.destructive.opacity(0.25), lineWidth: 1)
        )
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

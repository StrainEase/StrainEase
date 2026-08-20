import SwiftUI

/// Full-screen age-verification gate. Mirrors the web `AgeGate` component:
/// region picker + date-of-birth + Terms & Privacy acceptance, then either
/// enters the app or locks the user out.
///
/// Local gate is the source of truth. No server-side custom claim enforcement.
struct AgeGateView: View {
    let store: AgeVerificationStore

    @State private var region: AgeRegion = .us
    @State private var birthDate: Date = Calendar.current.date(byAdding: .year, value: -25, to: Date()) ?? Date()
    @State private var termsAccepted = false
    @State private var privacyAccepted = false
    @State private var failure: AgeFailure?
    @State private var submitting = false

    private var canSubmit: Bool {
        !submitting && termsAccepted && privacyAccepted
    }

    var body: some View {
        ZStack {
            MeshBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    header
                    form
                    actions
                    if let failure {
                        errorBanner(failure)
                    }
                    footer
                }
                .padding(.horizontal, 22)
                .padding(.top, 28)
                .padding(.bottom, 40)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .interactiveDismissDisabled(true)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 14) {
            Eyebrow(text: "Age verification required")
            Text("Welcome to StrainEase")
                .font(.system(.largeTitle, design: .serif).weight(.regular))
                .foregroundStyle(Palette.foreground)
            Text("StrainEase provides cannabis research information intended for adults of legal age in their jurisdiction. Please confirm your age before continuing.")
                .font(.system(size: 15))
                .foregroundStyle(Palette.mutedForeground)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var form: some View {
        SWCard(emphasized: true) {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Where are you located?")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Palette.mutedForeground)
                    Picker("Region", selection: $region) {
                        ForEach(AgeRegion.allCases) { code in
                            HStack {
                                Text(code.label)
                                Text("\(code.minimumAge)+")
                                    .font(.caption)
                                    .foregroundStyle(Palette.mutedForeground)
                            }
                            .tag(code)
                        }
                    }
                    .pickerStyle(.menu)
                    .tint(Palette.foreground)
                    Text(region.legalNote)
                        .font(.system(size: 12))
                        .foregroundStyle(Palette.mutedForeground)
                        .fixedSize(horizontal: false, vertical: true)
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("What's your date of birth?")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Palette.mutedForeground)
                    DatePicker(
                        "Date of birth",
                        selection: $birthDate,
                        in: ...Date(),
                        displayedComponents: .date
                    )
                    .datePickerStyle(.compact)
                    .labelsHidden()
                    Text("Must be at least \(region.minimumAge) for your region.")
                        .font(.system(size: 12))
                        .foregroundStyle(Palette.mutedForeground)
                }

                VStack(alignment: .leading, spacing: 10) {
                    agreementToggle(
                        text: "I agree to the Terms of Service.",
                        isOn: $termsAccepted,
                    )
                    agreementToggle(
                        text: "I've read the Privacy Policy.",
                        isOn: $privacyAccepted,
                    )
                }
            }
        }
    }

    private var actions: some View {
        SWPrimaryButton(title: "I'm \(region.minimumAge) or older — enter StrainEase", systemImage: "leaf.fill") {
            submit()
        }
        .disabled(!canSubmit)
        .opacity(canSubmit ? 1 : 0.55)
    }

    private var footer: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("StrainEase is a research tool. It does not sell or dispense cannabis products. You may need to re-verify in 30 days.")
                .font(.system(size: 12))
                .foregroundStyle(Palette.mutedForeground)
                .fixedSize(horizontal: false, vertical: true)
            Text("Keep all cannabis products out of the reach of children and pets. If accidentally consumed, contact Poison Control (1-800-222-1222 in the US) or your local emergency line.")
                .font(.system(size: 12))
                .foregroundStyle(Palette.mutedForeground)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func agreementToggle(text: String, isOn: Binding<Bool>) -> some View {
        Toggle(isOn: isOn) {
            Text(text)
                .font(.system(size: 14))
                .foregroundStyle(Palette.foreground)
        }
        .toggleStyle(SWCheckboxStyle())
    }

    private func errorBanner(_ failure: AgeFailure) -> some View {
        let title: String
        let body: String
        switch failure {
        case .missingBirthDate:
            title = "We need your date of birth"
            body = "Please enter your full date of birth."
        case .invalid:
            title = "That date doesn't look right"
            body = "Please enter a valid date of birth."
        case .future:
            title = "That date is in the future"
            body = "Please double-check the date you entered."
        case .underage:
            title = "Sorry — StrainEase is for adults only"
            body = "If you are under the legal age for your region, please don't continue."
        }
        return SWErrorBanner(message: "\(title) · \(body)")
    }

    private func submit() {
        guard canSubmit else { return }
        failure = nil
        submitting = true
        Task {
            defer { submitting = false }
            let result = store.verify(region: region, birthDate: birthDate)
            switch result {
            case .failure(let why):
                failure = why
            case .success:
                break
            }
        }
    }
}

private struct SWCheckboxStyle: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View {
        Button {
            configuration.isOn.toggle()
        } label: {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: configuration.isOn ? "checkmark.square.fill" : "square")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(configuration.isOn ? Palette.primary : Palette.mutedForeground)
                    .frame(width: 22, height: 22)
                configuration.label
                Spacer(minLength: 0)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

#Preview("Unverified") {
    AgeGateView(store: AgeVerificationStore())
        .environment(AuthSession.previewSignedOut)
}
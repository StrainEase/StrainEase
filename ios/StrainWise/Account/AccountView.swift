import SwiftUI

struct AccountView: View {
    @Environment(AuthSession.self) private var session
    @Environment(\.dismiss) private var dismiss
    @Environment(AppNavigation.self) private var nav
    @State private var showSignOut = false
    @State private var draftName = ""
    @State private var didSave = false

    var body: some View {
        NavigationStack {
            ZStack {
                MeshBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        header
                        displayName
                        SavedAilmentsCard(onFind: { ailments in
                            nav.openFind(ailments: ailments)
                        })
                        SavedMedicationsCard()
                        NavigationLink {
                            ResearchHistoryView()
                        } label: {
                            SWCard {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Past research")
                                            .font(.system(size: 16, weight: .semibold))
                                            .foregroundStyle(Palette.foreground)
                                        Text("Reopen a find or comparison")
                                            .font(.system(size: 13))
                                            .foregroundStyle(Palette.mutedForeground)
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundStyle(Palette.mutedForeground)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                        NavigationLink {
                            ReliefHistoryView()
                        } label: {
                            SWCard {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Relief history")
                                            .font(.system(size: 16, weight: .semibold))
                                            .foregroundStyle(Palette.foreground)
                                        Text("How strains actually went for you")
                                            .font(.system(size: 13))
                                            .foregroundStyle(Palette.mutedForeground)
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundStyle(Palette.mutedForeground)
                                }
                            }
                        }
                        .buttonStyle(.plain)

                        SWCard {
                            VStack(alignment: .leading, spacing: 10) {
                                labeled("Email", session.user?.email ?? "Not on file")
                                labeled("Account", "Same Firebase login as the web app")
                            }
                        }
                        SWPrimaryButton(title: "Sign out", systemImage: "rectangle.portrait.and.arrow.right") {
                            showSignOut = true
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 32)
                }
            }
            .navigationTitle("Account settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.hidden, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") { dismiss() }
                }
            }
            .confirmationDialog("Sign out of StrainEase?", isPresented: $showSignOut, titleVisibility: .visible) {
                Button("Sign out", role: .destructive) { session.signOut() }
                Button("Cancel", role: .cancel) {}
            }
            .onAppear {
                draftName = session.user?.name ?? ""
            }
            .accessibilityIdentifier("account.root")
        }
        .tint(Palette.primary)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            Eyebrow(text: "Settings")
            Text(session.user?.name ?? "Patient")
                .font(.system(.largeTitle, design: .serif).weight(.regular))
                .foregroundStyle(Palette.foreground)
            Text("Update how your name appears on notes you share, or sign out.")
                .font(.system(size: 15))
                .foregroundStyle(Palette.mutedForeground)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var displayName: some View {
        SWCard {
            VStack(alignment: .leading, spacing: 10) {
                labeled("Display name", "")
                TextField("Display name", text: $draftName)
                    .textInputAutocapitalization(.words)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 11)
                    .background(Palette.muted.opacity(0.55), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .strokeBorder(Palette.border, lineWidth: 1)
                    )
                    .onChange(of: draftName) { _, _ in didSave = false }
                    .accessibilityIdentifier("account.displayName")
                Text("Shown next to notes you mark public on a strain’s page.")
                    .font(.system(size: 12))
                    .foregroundStyle(Palette.mutedForeground)
                if didSave {
                    Text("Display name updated.")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Palette.primary)
                }
                Button {
                    Task {
                        await session.updateDisplayName(draftName)
                        if session.errorMessage == nil {
                            didSave = true
                        }
                    }
                } label: {
                    Text(session.isBusy ? "Saving…" : "Save")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(canSave ? Palette.primaryForeground : Palette.mutedForeground)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(
                            canSave ? Palette.primary : Palette.muted,
                            in: Capsule()
                        )
                }
                .buttonStyle(.plain)
                .disabled(!canSave || session.isBusy)
                .accessibilityLabel("Save display name")
            }
        }
    }

    private var canSave: Bool {
        let trimmed = draftName.trimmingCharacters(in: .whitespacesAndNewlines)
        return !trimmed.isEmpty && trimmed != (session.user?.name ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func labeled(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .tracking(1.2)
                .foregroundStyle(Palette.mutedForeground)
            if !value.isEmpty {
                Text(value)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(Palette.foreground)
            }
        }
    }
}

#Preview("Account") {
    AccountView()
        .environment(AuthSession.previewSignedIn)
        .environment(AppNavigation())
        .environment(SavedStrainsStore.preview(["granddaddy-purple"]))
        .environment(SavedAilmentsStore.preview(["Anxiety"]))
        .environment(SavedMedicationsStore.preview(["Lexapro", "Ibuprofen"]))
        .environment(ReliefLogStore.preview([.sampleSleep]))
        .environment(ResearchHistoryStore.preview())
}

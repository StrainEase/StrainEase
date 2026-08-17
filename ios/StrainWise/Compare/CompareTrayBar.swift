import SwiftUI
import UIKit

/// Floating compare tray that floats above the tab bar (except on Find,
/// where the FindView's inline `compareTray` block is the single CTA).
///
/// Reads its selection + run state from the shared `CompareSelectionStore`
/// injected at the `MainTabView` root. The tray's "Compare N strains"
/// button calls `store.runCompare(...)` with empty conditions/prefs; on
/// success, the new `store.comparison` triggers a sheet containing a
/// `CompareResultsView` wrapped in its own `NavigationStack` so drilling
/// into a strain detail works without coupling to the Find tab's stack.
struct CompareTrayBar: View {
    @Environment(CompareSelectionStore.self) private var store
    @Environment(AppNavigation.self) private var nav
    @Environment(\.strainAPI) private var api
    @Environment(ResearchHistoryStore.self) private var history
    @Environment(\.horizontalSizeClass) private var hSize

    @State private var presented: ComparisonPresentation?
    @State private var trayPath: [StrainProfile] = []
    @State private var keyboardHeight: CGFloat = 0

    private var visible: Bool { !store.names.isEmpty && nav.tab != .find }

    var body: some View {
        Group {
            if visible {
                traySurface
                    .padding(.bottom, keyboardHeight)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.snappy(duration: 0.32), value: store.names.isEmpty)
        .animation(.snappy(duration: 0.32), value: nav.tab)
        .onChange(of: store.comparison) { _, new in
            // Only present the sheet on non-Find tabs — Find renders inline.
            // Sync once per non-nil comparison so the sheet doesn't keep
            // re-presenting when the user dismisses it manually.
            if let new, nav.tab != .find {
                presented = ComparisonPresentation(comparison: new)
            } else if new == nil {
                presented = nil
            }
        }
        .onChange(of: nav.tab) { _, new in
            // If the user switches to Find mid-comparison, dismiss the sheet
            // so the inline Find view takes over without a stacked sheet.
            if new == .find { presented = nil }
        }
        .sheet(item: $presented) { presentation in
            NavigationStack(path: $trayPath) {
                CompareResultsView(
                    comparison: presentation.comparison,
                    onSelectProfile: { trayPath.append($0) }
                )
                .navigationDestination(for: StrainProfile.self) { profile in
                    StrainDetailView(profile: profile)
                }
                .navigationTitle("Comparison")
                .navigationBarTitleDisplayMode(.inline)
            }
            .tint(Palette.primary)
        }
        .onReceive(
            NotificationCenter.default.publisher(for: UIResponder.keyboardWillChangeFrameNotification)
        ) { note in
            guard let endFrame = note.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else { return }
            let screenHeight = UIScreen.main.bounds.height
            // endFrame is in screen coords. When the keyboard is up,
            // endFrame.minY < screenHeight. We want the keyboard's height
            // so the tray floats just above it.
            let visible = max(0, screenHeight - endFrame.minY)
            withAnimation(.snappy(duration: 0.25)) {
                keyboardHeight = visible
            }
        }
    }

    private var traySurface: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .center, spacing: 8) {
                Text("Compare \(store.count)/3")
                    .font(.system(size: 12, weight: .semibold))
                    .tracking(1.0)
                    .foregroundStyle(Palette.mutedForeground)
                Spacer(minLength: 0)
                Button {
                    store.clear()
                } label: {
                    Text("Clear")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Palette.mutedForeground)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Clear compare selection")
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(store.names, id: \.self) { name in
                        chip(name)
                    }
                }
                .padding(.horizontal, 2)
                .padding(.vertical, 2)
            }

            // Surface the same `compareError` that drives the haptic so the
            // user actually sees what's wrong. `.sensoryFeedback(.error,
            // trigger:)` by itself only buzzes, easy to miss entirely.
            if let error = store.compareError {
                SWErrorBanner(message: error)
            }

            Button {
                Task {
                    await store.runCompare(
                        api: api,
                        conditions: [],
                        prefs: ResearchPrefs(),
                        reliefSummary: nil
                    )
                    if let comparison = store.comparison {
                        await history.remember(
                            compare: comparison,
                            names: store.names,
                            conditions: []
                        )
                    }
                }
            } label: {
                HStack(spacing: 10) {
                    if store.isComparing {
                        ProgressView()
                            .tint(Palette.primaryForeground)
                    } else {
                        Text(canRunCompare
                             ? "Compare \(store.count) strains"
                             : "Add at least 2 strains")
                            .font(.system(size: 15, weight: .semibold))
                    }
                    Spacer(minLength: 0)
                    Image(systemName: "arrow.left.arrow.right")
                        .font(.system(size: 13, weight: .semibold))
                        .frame(width: 28, height: 28)
                        .background(Palette.primaryForeground.opacity(0.16), in: Circle())
                }
                .foregroundStyle(Palette.primaryForeground)
                .padding(.horizontal, 18)
                .padding(.vertical, 10)
                .background(
                    LinearGradient(
                        colors: [Palette.primary, Palette.primary.opacity(0.82)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    in: Capsule()
                )
            }
            .buttonStyle(.plain)
            .disabled(!canRunCompare || store.isComparing)
            .opacity(canRunCompare || store.isComparing ? 1 : 0.55)
            .sensoryFeedback(.error, trigger: store.compareError)
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .padding(.bottom, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            Palette.background.opacity(0.94)
        )
        .overlay(alignment: .top) {
            Rectangle()
                .fill(Palette.border)
                .frame(height: 1)
        }
    }

    private var canRunCompare: Bool {
        store.canRunCompare
    }

    private func chip(_ name: String) -> some View {
        HStack(spacing: 6) {
            Text(name)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Palette.primaryForeground)
                .lineLimit(1)
            NoteBadge(profile: StrainProfile(name: name, inKnowledgeBase: false), size: 12, compact: true)
            Button {
                store.remove(name)
            } label: {
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
        .overlay(Capsule().strokeBorder(Palette.primary.opacity(0.4), lineWidth: 1))
    }
}
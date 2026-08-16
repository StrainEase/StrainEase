import SwiftUI

enum AppTab: String, Hashable, CaseIterable {
    case home
    case find
    case browse

    var title: String {
        switch self {
        case .home: "Home"
        case .find: "Find"
        case .browse: "Browse"
        }
    }

    var systemImage: String {
        switch self {
        case .home: "house.fill"
        case .find: "magnifyingglass"
        case .browse: "book.closed.fill"
        }
    }
}

@Observable
@MainActor
final class AppNavigation {
    var tab: AppTab = .home
    var showAccount = false

    func openLibrary() {
        tab = .browse
    }

    func openProfile() {
        showAccount = true
    }
}

extension View {
    func appChrome() -> some View {
        modifier(AppChromeModifier())
    }
}

private struct AppChromeModifier: ViewModifier {
    @Environment(AppNavigation.self) private var nav
    @Environment(AuthSession.self) private var session

    func body(content: Content) -> some View {
        content.toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button(action: nav.openLibrary) {
                    HStack(spacing: 6) {
                        Image(systemName: "books.vertical")
                            .font(.system(size: 14, weight: .semibold))
                        Text("Library")
                            .font(.system(size: 14, weight: .medium))
                    }
                    .foregroundStyle(nav.tab == .browse ? Palette.primary : Palette.mutedForeground)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(
                        Palette.card,
                        in: Capsule()
                    )
                    .overlay(
                        Capsule().strokeBorder(
                            nav.tab == .browse ? Palette.primary.opacity(0.4) : Palette.border,
                            lineWidth: 1
                        )
                    )
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Open strain library")
                .accessibilityAddTraits(nav.tab == .browse ? .isSelected : [])
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: nav.openProfile) {
                    Text(initials)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Palette.foreground)
                        .frame(width: 32, height: 32)
                        .background(Palette.card, in: Circle())
                        .overlay(Circle().strokeBorder(Palette.border, lineWidth: 1))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Profile")
                .accessibilityHint("Opens account settings")
            }
        }
    }

    private var initials: String {
        let trimmed = session.user?.name.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if trimmed.isEmpty { return "·" }
        let parts = trimmed.split(separator: " ")
        if parts.count == 1 { return String(parts[0].prefix(2)).uppercased() }
        return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
    }
}

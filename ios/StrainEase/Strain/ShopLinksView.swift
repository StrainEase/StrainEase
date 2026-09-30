import SwiftUI
import UIKit

/// Outbound shop links for a strain: Leafly's strain page and Weedmaps'
/// keyword search. Opens each in Safari via UIApplication.
struct ShopLinksView: View {
    let profile: StrainProfile

    var body: some View {
        SWCard {
            VStack(alignment: .leading, spacing: 12) {
                SectionLabel("Find this strain")
                Text("Open the strain page on Leafly or search dispensaries on Weedmaps.")
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.mutedForeground)
                    .fixedSize(horizontal: false, vertical: true)
                HStack(spacing: 10) {
                    Button {
                        UIApplication.shared.open(URL(string: leaflyURL)!)
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "leaf.fill")
                            Text("Leafly")
                            Image(systemName: "arrow.up.right")
                                .font(.system(size: 10, weight: .bold))
                        }
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Palette.primary)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Palette.card.opacity(0.7), in: Capsule())
                        .overlay(Capsule().strokeBorder(Palette.primary.opacity(0.4), lineWidth: 1))
                    }
                    .buttonStyle(.plain)

                    Button {
                        UIApplication.shared.open(URL(string: weedmapsURL)!)
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "map.fill")
                            Text("Weedmaps")
                            Image(systemName: "arrow.up.right")
                                .font(.system(size: 10, weight: .bold))
                        }
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Palette.primary)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Palette.card.opacity(0.7), in: Capsule())
                        .overlay(Capsule().strokeBorder(Palette.primary.opacity(0.4), lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .accessibilityIdentifier("strain.shopLinks")
    }

    private var leaflyURL: String {
        "https://www.leafly.com/strains/\(profile.slug)"
    }

    private var weedmapsURL: String {
        let name = profile.name.addingPercentEncoding(
            withAllowedCharacters: .urlQueryAllowed
        ) ?? profile.name
        return "https://weedmaps.com/search?keyword=\(name)"
    }
}

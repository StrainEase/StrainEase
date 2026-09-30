import SwiftUI

/// Vetted Reddit threads from the compare / find callable. Matches the web
/// `RedditThreads` card — outbound links only, never live-scraped.
struct RedditThreadsView: View {
    let sources: [RedditSource]
    var title = "Reddit threads for these strains"
    var description = "Real public threads — surfaced from a curated list, not live-scraped."

    var body: some View {
        if !sources.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(title)
                Text(description)
                    .font(.system(size: 12))
                    .foregroundStyle(Palette.mutedForeground)
                    .fixedSize(horizontal: false, vertical: true)
                VStack(spacing: 8) {
                    ForEach(sources) { source in
                        Link(destination: source.link) {
                            SWCard {
                                HStack(alignment: .top, spacing: 10) {
                                    Image(systemName: "bubble.left.and.bubble.right")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundStyle(Palette.primary)
                                        .frame(width: 28, height: 28)
                                        .background(Palette.primary.opacity(0.12), in: Circle())
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(source.title)
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(Palette.foreground)
                                            .multilineTextAlignment(.leading)
                                            .fixedSize(horizontal: false, vertical: true)
                                        Text(source.caption)
                                            .font(.system(size: 11, weight: .semibold))
                                            .foregroundStyle(Palette.mutedForeground)
                                        if let snippet = source.snippet, !snippet.isEmpty {
                                            Text(snippet)
                                                .font(.system(size: 13))
                                                .foregroundStyle(Palette.mutedForeground)
                                                .fixedSize(horizontal: false, vertical: true)
                                        }
                                    }
                                    Spacer(minLength: 8)
                                    Image(systemName: "arrow.up.right")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundStyle(Palette.mutedForeground)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("\(source.title), r/\(source.subreddit)")
                    }
                }
            }
        }
    }
}

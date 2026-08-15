import type { RedditSource } from "@/lib/strain-profile";
import { ExternalLink, MessageCircle } from "lucide-react";

/**
 * Renders a vetted list of Reddit threads as outbound links. Used by both the
 * analysis panel (compare) and the recommendation panel (find). Threads are
 * surfaced from a curated, verified list — never live-scraped.
 */
export function RedditThreads({
  sources,
  title = "Reddit threads for these strains",
  description = "Real public threads — surfaced from a curated list, not live-scraped.",
}: {
  sources: RedditSource[];
  title?: string;
  description?: string;
}) {
  if (sources.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-6 py-6 sm:px-8">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
        <MessageCircle className="size-3.5" />
        {title}
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {sources.map((src) => (
          <li key={src.url}>
            <a
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-w-0 items-start gap-3 rounded-xl border border-border/70 bg-background/70 px-4 py-3 transition-colors hover:border-primary/40"
            >
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-600">
                <MessageCircle className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-medium leading-5 group-hover:text-primary">
                  {src.title}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  r/{src.subreddit}
                  {typeof src.score === "number" && src.score > 0 ? (
                    <span className="font-normal text-muted-foreground/80">
                      · {src.score.toLocaleString("en-US")} pts
                    </span>
                  ) : null}
                </span>
                {src.snippet ? (
                  <span className="mt-1.5 block break-words text-xs leading-5 text-muted-foreground">
                    {src.snippet}
                  </span>
                ) : null}
              </span>
              <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

import type { RedditSource } from "@/lib/strain-profile";
import { ExternalLink, MessageCircle } from "lucide-react";
import { SWCard } from "@/components/ui/sw-card";

/** Skeleton placeholder that mirrors the loaded Reddit thread SWCard shape
 * while data is in flight. Uses the project-wide `skeleton-line` class
 * so the pulse animation is consistent with every other loading state. */
function RedditThreadsSkeleton({
  title = "Reddit threads for these strains",
  description = "Real public threads — surfaced from a curated list, not live-scraped.",
  count = 3,
}: {
  title?: string;
  description?: string;
  count?: number;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <MessageCircle className="size-3.5" />
          {title}
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {Array.from({ length: count }, (_, i) => (
          <li key={i}>
            <SWCard innerClassName="flex items-start gap-2.5 px-4 py-3">
              <span className="skeleton-line mt-0.5 size-7 shrink-0 rounded-full" />
              <span className="flex-1 space-y-2">
                <span className="skeleton-line block h-4 w-3/4 rounded-full" />
                <span className="skeleton-line block h-3 w-1/3 rounded-full" />
                <span className="skeleton-line block h-3 w-full rounded-full" />
              </span>
            </SWCard>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Renders a vetted list of Reddit threads as outbound links. Used by both the
 * analysis panel (compare) and the recommendation panel (find). Threads are
 * surfaced from a curated, verified list — never live-scraped.
 */
export function RedditThreads({
  sources,
  loading = false,
  title = "Reddit threads for these strains",
  description = "Real public threads — surfaced from a curated list, not live-scraped.",
}: {
  sources: RedditSource[];
  loading?: boolean;
  title?: string;
  description?: string;
}) {
  if (loading) return <RedditThreadsSkeleton title={title} description={description} />;
  if (sources.length === 0) return null;
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <MessageCircle className="size-3.5" />
          {title}
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {sources.map((src) => (
          <li key={src.url}>
            <a
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block min-w-0"
            >
              <SWCard innerClassName="flex items-start gap-2.5 px-4 py-3 transition-colors group-hover:border-primary/40">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
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
              </SWCard>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

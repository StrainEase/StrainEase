/**
 * Loading skeleton for the "Strains in this family" section inside
 * the terpene detail dialog / page. Renders three card-shaped rows
 * to mirror the eventual layout (photo + name + THC + 3 effect pills)
 * while the popular-strains list is being fetched.
 */
export function TerpeneDetailSkeleton() {
  return (
    <div aria-hidden role="status" className="grid gap-3 sm:grid-cols-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-3"
        >
          <span className="skeleton-line size-12 shrink-0 rounded-xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="skeleton-line h-3 w-2/3 rounded-full" />
            <span className="skeleton-line h-2 w-1/3 rounded-full" />
            <div className="mt-1 flex gap-1">
              <span className="skeleton-line h-3 w-10 rounded-full" />
              <span className="skeleton-line h-3 w-12 rounded-full" />
              <span className="skeleton-line h-3 w-8 rounded-full" />
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Loading strains…</span>
    </div>
  );
}

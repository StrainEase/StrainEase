import { Button } from "@/components/ui/button";
import { slugify } from "@/lib/saved-strains";
import type { StrainProfile } from "@/lib/strain-profile";
import { ExternalLink, Leaf, MapPin } from "lucide-react";

/**
 * Outbound shop links for a strain. Each link opens the strain's
 * listing page on Leafly or Weedmaps in a new tab so users can find
 * dispensaries carrying it. The URLs follow Leafly's /strains/{slug}
 * and Weedmaps' /search?keyword={name} shape (no API key needed).
 */
export function ShopLinks({ strain }: { strain: StrainProfile }) {
  const slug = slugify(strain.name);
  const weedmaps = `https://weedmaps.com/search?keyword=${encodeURIComponent(strain.name)}`;
  const leafly = `https://www.leafly.com/strains/${slug}`;

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Find this strain
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Open the strain page on Leafly or search dispensaries on Weedmaps.
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="cursor-pointer rounded-full"
        >
          <a href={leafly} target="_blank" rel="noopener noreferrer">
            <Leaf className="size-3.5" />
            Leafly
            <ExternalLink className="size-3" />
          </a>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="cursor-pointer rounded-full"
        >
          <a href={weedmaps} target="_blank" rel="noopener noreferrer">
            <MapPin className="size-3.5" />
            Weedmaps
            <ExternalLink className="size-3" />
          </a>
        </Button>
      </div>
    </div>
  );
}

import { useAuth } from "@/hooks/use-auth";
import {
  listenToSavedStrains,
  removeSavedStrain,
  type SavedStrain,
} from "@/lib/saved-strains";
import { listenToReliefLogs, type ReliefLog } from "@/lib/relief-log";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { ComparableStrainPoster } from "@/components/strain/ComparableStrainPoster";
import { ReliefInsightsPanel } from "@/components/saved/ReliefInsightsPanel";
import { Bookmark, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

/**
 * Vertical 2-column grid of saved strains. 1:1 port of the
 * iOS `SavedStrainsView` (PR #269 follow-up `511be57e`)
 * and the Android `SavedStrainsSheet` (PR #270 follow-up).
 * Notes, public reviews, and relief history for a saved
 * strain live on the strain detail page (see
 * `<SavedStrainNotes />` in `src/pages/Strain.tsx`) — the
 * modal is just the favorites grid so the heart button
 * surfaces a clean cross-platform view.
 */
export function SavedStrainsPanel() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<SavedStrain[] | null>(null);
  const [logs, setLogs] = useState<ReliefLog[]>([]);

  useEffect(() => {
    if (!db || !user) {
      setSaved([]);
      return;
    }
    return listenToSavedStrains(user.uid, setSaved);
  }, [user?.uid]);

  useEffect(() => {
    if (!db || !user) {
      setLogs([]);
      return;
    }
    return listenToReliefLogs(user.uid, setLogs);
  }, [user?.uid]);

  if (!isFirebaseConfigured) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card px-8 py-12 text-center">
        <Bookmark className="mx-auto size-8 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold tracking-tight">
          Saving needs Firebase
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Add your Firebase keys in the Keys/API keys tab (VITE_FIREBASE_API_KEY,
          VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID) to save strains
          and write notes.
        </p>
      </div>
    );
  }

  if (saved === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (saved.length === 0) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card px-8 py-12 text-center">
        <Bookmark className="mx-auto size-8 text-primary" />
        <h2 className="mt-4 text-lg font-semibold tracking-tight">
          No saved strains yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Hit "Save" on any strain in search results, finder picks, or
          comparisons and it will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ReliefInsightsPanel logs={logs} />
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Bookmark className="size-3.5 text-primary" />
        {saved.length} saved {saved.length === 1 ? "strain" : "strains"}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {saved.map((item) => (
          <SavedStrainCell
            key={item.slug}
            item={item}
            onRemove={(slug) => {
              if (!db || !user) return;
              void removeSavedStrain(user.uid, slug).catch((err: unknown) =>
                toast(
                  err instanceof Error
                    ? err.message
                    : "Could not remove that strain.",
                ),
              );
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SavedStrainCell({
  item,
  onRemove,
}: {
  item: SavedStrain;
  onRemove: (slug: string) => void;
}) {
  return (
    <div className="group relative min-w-0">
      <ComparableStrainPoster
        profile={{
          name: item.name,
          inKnowledgeBase: true,
          type: item.type,
          thcRange: item.thcRange,
          imageUrl: item.imageUrl,
        }}
        compact
        className="min-w-0"
      />
      <button
        type="button"
        aria-label={`Remove ${item.name}`}
        onClick={(event) => {
          // Don't let the click fall through to the poster
          // link underneath.
          event.preventDefault();
          event.stopPropagation();
          onRemove(item.slug);
        }}
        className="absolute right-1.5 top-1.5 z-20 flex size-6 cursor-pointer items-center justify-center rounded-full border border-border/70 bg-background/95 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 hover:text-destructive"
      >
        <X className="size-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

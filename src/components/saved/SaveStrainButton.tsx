import { useAuth } from "@/hooks/use-auth";
import {
  isStrainSaved,
  removeSavedStrain,
  saveStrain,
  slugify,
} from "@/lib/saved-strains";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import type { StrainProfile } from "@/lib/strain-profile";
import { StrainNoteIndicator } from "@/components/saved/StrainNoteIndicator";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useEffect, useState } from "react";

export function SaveStrainButton({
  profile,
  className,
}: {
  profile: StrainProfile;
  className?: string;
}) {
  const { user, isAuthenticated } = useAuth();
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    if (!db || !user) {
      setSaved(false);
      setReady(true);
      return;
    }
    try {
      setSaved(await isStrainSaved(user.uid, slugify(profile.name)));
    } catch {
      // Keep the last known state — a failed read must not look unsaved.
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    setReady(false);
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, profile.name]);

  const toggle = async () => {
    if (!db || !user || busy || !ready) return;
    setBusy(true);
    try {
      if (saved) {
        await removeSavedStrain(user.uid, slugify(profile.name));
      } else {
        await saveStrain(user.uid, profile);
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!isAuthenticated || !db) return null;

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      title={saved ? "Remove from saved strains" : "Save this strain"}
      disabled={busy || !ready}
      className={cn(
        "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        saved
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-primary",
        busy && "opacity-50",
        className,
      )}
    >
      {saved ? (
        <>
          <BookmarkCheck className="size-3.5" />
          Saved
          <StrainNoteIndicator strainName={profile.name} />
        </>
      ) : (
        <>
          <Bookmark className="size-3.5" />
          Save
        </>
      )}
    </button>
  );
}

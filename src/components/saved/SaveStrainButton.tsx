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
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    if (!db || !user) {
      setSaved(false);
      return;
    }
    const isSaved = await isStrainSaved(user.uid, slugify(profile.name));
    setSaved(isSaved);
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, profile.name]);

  const toggle = async () => {
    if (!db || !user || busy) return;
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
      disabled={busy}
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

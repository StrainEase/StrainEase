import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { slugify } from "@/lib/saved-strains";
import { cn } from "@/lib/utils";
import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { NotebookPen } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Renders the small notebook icon next to a strain name whenever the current
 * user has at least one saved note on it. Self-contained: it subscribes to
 * `users/{uid}/savedStrains/{slug}` and stays in sync as notes are added or
 * removed. Returns `null` when there are no notes, so callers can drop it
 * inline next to a strain name without reserving layout space.
 *
 * Visual + tooltip wording match the existing indicator inside
 * `SavedStrainsPanel`. iOS uses the same signal on `StrainPoster` via
 * `noteCount > 0` → `square.and.pencil`.
 */
export function StrainNoteIndicator({
  strainName,
  className,
}: {
  strainName: string;
  className?: string;
}) {
  const { user } = useAuth();
  const [noteCount, setNoteCount] = useState(0);

  useEffect(() => {
    if (!db || !user) {
      setNoteCount(0);
      return;
    }
    const slug = slugify(strainName);
    if (!slug) {
      setNoteCount(0);
      return;
    }
    const unsubscribe: Unsubscribe = onSnapshot(
      doc(db, "users", user.uid, "savedStrains", slug),
      (snap) => {
        const data = snap.data() as { notes?: unknown[] } | undefined;
        setNoteCount(Array.isArray(data?.notes) ? data.notes.length : 0);
      },
      () => {
        // Rules not deployed / offline — render silently.
        setNoteCount(0);
      },
    );
    return unsubscribe;
  }, [user?.uid, strainName]);

  if (noteCount === 0) return null;

  const noun = noteCount === 1 ? "note" : "notes";
  const tooltip = `You have ${noteCount} ${noun} on this strain`;

  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/35 bg-primary/10 px-1.5 py-0.5 text-primary",
        className,
      )}
    >
      <NotebookPen className="size-3" aria-hidden />
    </span>
  );
}
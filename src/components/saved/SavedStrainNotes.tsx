import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import {
  addNote,
  removeNote,
  saveStrain,
  setNotePublic,
  type SavedNote,
} from "@/lib/saved-strains";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SkeletonLines } from "@/components/ui/skeleton-lines";
import { SWCard } from "@/components/ui/sw-card";
import { cn } from "@/lib/utils";
import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { Globe, Lock, Loader2, NotebookPen, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Private + public notes for a single saved strain. Self-contained: it
 * subscribes to `users/{uid}/savedStrains/{slug}` and renders the add
 * form, the existing note list, public/private toggle, and delete.
 *
 * Adding a note auto-saves the strain first, matching iOS
 * `SavedStrainsStore.addNote(to:)`.
 */
export function SavedStrainNotes({
  slug,
  strainName,
  isSaved,
}: {
  slug: string;
  strainName: string;
  isSaved: boolean;
}) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [draft, setDraft] = useState("");
  const [makePublic, setMakePublic] = useState(false);
  const [rating, setRating] = useState(0);
  const [intensity, setIntensity] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notesLoaded, setNotesLoaded] = useState(false);

  useEffect(() => {
    if (!db || !user) {
      setNotes([]);
      setNotesLoaded(false);
      return;
    }
    setNotesLoaded(false);
    const unsubscribe: Unsubscribe = onSnapshot(
      doc(db, "users", user.uid, "savedStrains", slug),
      (snap) => {
        const data = snap.data() as { notes?: SavedNote[] } | undefined;
        setNotes(Array.isArray(data?.notes) ? data.notes : []);
        setNotesLoaded(true);
      },
      () => {
        // Offline / rules not deployed yet — render an empty list silently.
        setNotes([]);
        setNotesLoaded(true);
      },
    );
    return unsubscribe;
  }, [user?.uid, slug]);

  if (!user) return null;

  if (!notesLoaded && isSaved) {
    return (
      <SWCard innerClassName="p-6">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin text-primary" />
          Your notes
        </div>
        <div className="mt-4">
          <SkeletonLines variant="compact" />
        </div>
      </SWCard>
    );
  }

  const submit = async () => {
    if (!db || !user || busy) return;
    const text = draft.trim();
    if (text === "") return;
    setBusy(true);
    try {
      if (!isSaved) {
        await saveStrain(user.uid, {
          name: strainName,
          inKnowledgeBase: false,
        });
      }
      await addNote(
        user.uid,
        slug,
        text,
        makePublic,
        user.name,
        strainName,
        rating,
        intensity,
      );
      setDraft("");
      setMakePublic(false);
      setRating(0);
      setIntensity(0);
      toast.success("Note saved.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save the note.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SWCard innerClassName="p-6">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <NotebookPen className="size-3.5 text-primary" />
        Your notes
      </div>

      {notes.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No notes yet — jot down how this strain felt for you.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {notes.map((note) => (
            <li
              key={note.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background px-4 py-3"
            >
              <div className="min-w-0">
                {note.rating || note.intensity ? (
                  <p className="mb-1 flex items-center gap-2 text-[13px] leading-none">
                    {note.rating ? (
                      <span className="text-primary">
                        {"★".repeat(note.rating)}
                        <span className="text-muted-foreground/35">
                          {"★".repeat(5 - note.rating)}
                        </span>
                      </span>
                    ) : null}
                    {note.intensity ? (
                      <span
                        className="flex items-center gap-0.5"
                        aria-label={`Intensity ${note.intensity} of 5`}
                      >
                        {[1, 2, 3, 4, 5].map((i) => (
                          <span
                            key={i}
                            className={cn(
                              "size-1.5 rounded-full",
                              i <= (note.intensity ?? 0)
                                ? "bg-primary"
                                : "bg-muted-foreground/25",
                            )}
                          />
                        ))}
                      </span>
                    ) : null}
                  </p>
                ) : null}
                <p className="text-sm leading-6">{note.text}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatDate(note.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (db && user)
                      void setNotePublic(
                        user.uid,
                        slug,
                        note.id,
                        !note.isPublic,
                        user.name,
                        strainName,
                      );
                  }}
                  aria-label={
                    note.isPublic ? "Make note private" : "Share note publicly"
                  }
                  title={
                    note.isPublic
                      ? "Public — visible to everyone"
                      : "Private — only you can see this"
                  }
                  className={cn(
                    "flex size-8 cursor-pointer items-center justify-center rounded-full border transition-colors",
                    note.isPublic
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/70 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {note.isPublic ? (
                    <Globe className="size-3.5" />
                  ) : (
                    <Lock className="size-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  aria-label="Delete note"
                  className="flex size-8 cursor-pointer items-center justify-center rounded-full p-1 text-muted-foreground transition-colors hover:text-destructive"
                  onClick={() => {
                    if (db && user) void removeNote(user.uid, slug, note.id);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Rating and Intensity recorded separately, two centered
          columns — mirrors the Android "How did it work for you?"
          card. Tap the selected star/dot again to clear. */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Rating
          </p>
          <div className="mt-1 flex items-center justify-center gap-0.5">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value === rating ? 0 : value)}
                aria-label={`Rate ${value} of 5`}
                aria-pressed={value <= rating}
                className="cursor-pointer p-0.5 text-lg leading-none transition-colors"
              >
                <span
                  className={
                    value <= rating
                      ? "text-primary"
                      : "text-muted-foreground/40 hover:text-muted-foreground"
                  }
                >
                  ★
                </span>
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {rating}/5
            </p>
          )}
        </div>
        <div className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Intensity
          </p>
          <div className="mt-1.5 flex items-center justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setIntensity(value === intensity ? 0 : value)
                }
                aria-label={`Set intensity ${value} of 5`}
                aria-pressed={value <= intensity}
                className={cn(
                  "size-3.5 cursor-pointer rounded-full transition-colors",
                  value <= intensity
                    ? "bg-primary"
                    : "bg-muted-foreground/25 hover:bg-muted-foreground/50",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="Add a note about this strain…"
          className="h-9"
        />
        <button
          type="button"
          onClick={() => setMakePublic((p) => !p)}
          aria-label={makePublic ? "Make this note public" : "Keep this note private"}
          title={
            makePublic
              ? "Public — visible to everyone"
              : "Private — only you can see this"
          }
          className={cn(
            "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors",
            makePublic
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border/70 text-muted-foreground hover:text-foreground",
          )}
        >
          {makePublic ? <Globe className="size-4" /> : <Lock className="size-4" />}
        </button>
        <Button
          type="button"
          size="sm"
          className="shrink-0 cursor-pointer rounded-full"
          disabled={busy || draft.trim() === ""}
          onClick={() => void submit()}
        >
          <Plus className="size-4" />
          Save
        </Button>
      </div>
    </SWCard>
  );
}
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
      <div className="rounded-2xl border border-border/70 bg-card p-6">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin text-primary" />
          Your notes
        </div>
        <div className="mt-4">
          <SkeletonLines variant="compact" />
        </div>
      </div>
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
      await addNote(user.uid, slug, text, makePublic, user.name, strainName);
      setDraft("");
      setMakePublic(false);
      toast.success("Note saved.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save the note.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6">
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

      <div className="mt-4 flex items-center gap-2">
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
    </div>
  );
}
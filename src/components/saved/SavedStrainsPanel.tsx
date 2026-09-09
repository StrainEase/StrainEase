import { useAuth } from "@/hooks/use-auth";
import {
  addNote,
  listenToPublicNotes,
  listenToSavedStrains,
  removeNote,
  removeSavedStrain,
  setNoteAnonymous,
  type PublicNote,
  type SavedStrain,
} from "@/lib/saved-strains";
import { listenToReliefLogs, type ReliefLog } from "@/lib/relief-log";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { StrainImage } from "@/components/strain/StrainImage";
import { getPhotoURL } from "@/lib/strain-catalog";
import { TYPE_LABEL, typeBadgeClass } from "@/lib/strain-ui";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReliefLogButton } from "@/components/saved/ReliefLogButton";
import { ReliefInsightsPanel } from "@/components/saved/ReliefInsightsPanel";
import {
  Bookmark,
  ChevronDown,
  Loader2,
  Lock,
  MessageCircle,
  Moon,
  NotebookPen,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SavedStrainsPanel() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<SavedStrain[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [draftAnonymous, setDraftAnonymous] = useState(true);
  const [publicNotes, setPublicNotes] = useState<Record<string, PublicNote[]>>(
    {},
  );
  const [logs, setLogs] = useState<ReliefLog[]>([]);
  const [busy, setBusy] = useState(false);

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

  useEffect(() => {
    if (!db || !open) return;
    return listenToPublicNotes(open, (notes) =>
      setPublicNotes((prev) => ({ ...prev, [open]: notes })),
    );
  }, [open]);

  if (!isFirebaseConfigured) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card px-8 py-12 text-center">
        <Bookmark className="mx-auto size-8 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold tracking-tight">
          Saving needs Firebase
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Add your Firebase keys in the Keys/API keys tab
          (VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN,
          VITE_FIREBASE_PROJECT_ID) to save strains and notes.
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
          Hit "Save" on any strain in your search results, finder picks, or
          comparisons and it'll show up here where you can write your public
          review.
        </p>
      </div>
    );
  }

  if (!user) return null;

  const addNoteFor = async (strain: SavedStrain) => {
    if (!db || !user) return;
    const text = (draft[strain.slug] ?? "").trim();
    if (text === "") return;
    setBusy(true);
    try {
      await addNote(
        user.uid,
        strain.slug,
        text,
        draftAnonymous,
        user.name,
        strain.name,
      );
      setDraft((prev) => ({ ...prev, [strain.slug]: "" }));
      setDraftAnonymous(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save the note.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <ReliefInsightsPanel logs={logs} />

      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Bookmark className="size-3.5 text-primary" />
        {saved.length} saved {saved.length === 1 ? "strain" : "strains"}
      </div>

      {saved.map((strain) => {
        const expanded = open === strain.slug;
        const community = publicNotes[strain.slug] ?? [];
        return (
          <div
            key={strain.slug}
            className="overflow-hidden rounded-2xl border border-border/70 bg-card"
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : strain.slug)}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
              >
                <StrainImage
                  src={strain.imageUrl}
                  fallbackSrc={getPhotoURL(strain.name)}
                  alt=""
                  className="size-11 shrink-0 rounded-lg border border-border/70"
                  iconClassName="size-4"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-base font-semibold tracking-tight">
                      {strain.name}
                    </p>
                    {strain.notes.length > 0 && (
                      <span
                        title="This strain has your notes"
                        className="shrink-0 text-primary"
                      >
                        <NotebookPen
                          className="size-3.5"
                          aria-label="Has notes"
                        />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[
                      strain.type ? TYPE_LABEL[strain.type] : null,
                      strain.thcRange ? `THC ${strain.thcRange}` : null,
                      `saved ${formatDate(strain.savedAt)}`,
                      strain.notes.length > 0
                        ? `${strain.notes.length} note${strain.notes.length === 1 ? "" : "s"}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                {strain.type && (
                  <Badge
                    className={cn(typeBadgeClass(strain.type), "capitalize")}
                  >
                    {TYPE_LABEL[strain.type]}
                  </Badge>
                )}
                <ReliefLogButton strainName={strain.name} />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (db && user)
                      void removeSavedStrain(user.uid, strain.slug);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    expanded && "rotate-180",
                  )}
                />
              </div>
            </div>

            {expanded && (
              <div className="space-y-5 border-t border-border/60 px-5 py-5">
                {/* Your review */}
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Your review
                  </p>
                  {strain.notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nothing here yet — write your review below. It's public on
                      this strain's page and shows your name unless you stay
                      anonymous.
                    </p>
                  ) : (
                    <ul className="space-y-2.5">
                      {strain.notes.map((note) => (
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
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (db && user)
                                  void setNoteAnonymous(
                                    user.uid,
                                    strain.slug,
                                    note.id,
                                    !note.anonymous,
                                    user.name,
                                    strain.name,
                                  );
                              }}
                              className={cn(
                                "flex cursor-pointer items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors",
                                note.anonymous
                                  ? "border-border/70 text-muted-foreground hover:text-foreground"
                                  : "border-primary/40 bg-primary/10 text-primary",
                              )}
                              title={
                                note.anonymous
                                  ? "Anonymous — name hidden from other patients"
                                  : "Shown as " + user.name
                              }
                            >
                              {note.anonymous ? (
                                <Lock className="size-3" />
                              ) : (
                                <User className="size-3" />
                              )}
                              {note.anonymous ? "Anonymous" : "Name shown"}
                            </button>
                            <button
                              type="button"
                              aria-label="Delete note"
                              className="cursor-pointer rounded-full p-1 text-muted-foreground transition-colors hover:text-destructive"
                              onClick={() => {
                                if (db && user)
                                  void removeNote(
                                    user.uid,
                                    strain.slug,
                                    note.id,
                                  );
                              }}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <Input
                      value={draft[strain.slug] ?? ""}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [strain.slug]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void addNoteFor(strain);
                        }
                      }}
                      placeholder="Add a note about this strain…"
                      className="h-9"
                    />
                    <button
                      type="button"
                      onClick={() => setDraftAnonymous((a) => !a)}
                      className={cn(
                        "flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                        draftAnonymous
                          ? "border-border/70 text-muted-foreground hover:text-foreground"
                          : "border-primary/40 bg-primary/10 text-primary",
                      )}
                      title={
                        draftAnonymous
                          ? "Anonymous — name hidden from other patients"
                          : "Shown as " + user.name
                      }
                    >
                      {draftAnonymous ? (
                        <Lock className="size-3" />
                      ) : (
                        <User className="size-3" />
                      )}
                      {draftAnonymous ? "Anonymous" : "Name shown"}
                    </button>
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0 cursor-pointer rounded-full"
                      disabled={
                        busy || (draft[strain.slug] ?? "").trim() === ""
                      }
                      onClick={() => void addNoteFor(strain)}
                    >
                      <Plus className="size-4" />
                      Add
                    </Button>
                  </div>
                </div>

                {/* Past relief logs */}
                {(() => {
                  const strainLogs = logs.filter(
                    (l) =>
                      l.strainName.trim().toLowerCase() ===
                      strain.name.trim().toLowerCase(),
                  );
                  if (strainLogs.length === 0) return null;
                  return (
                    <div>
                      <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <Moon className="size-3.5 text-primary" />
                        Relief history
                      </p>
                      <ul className="space-y-2.5">
                        {strainLogs.map((log) => (
                          <li
                            key={log.id}
                            className="rounded-xl border border-border/60 bg-background px-4 py-3"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="flex items-center gap-1.5 font-medium capitalize">
                                {log.rating ? (
                                  <span
                                    className="text-primary"
                                    aria-label={`Rated ${log.rating} of 5`}
                                  >
                                    {"★".repeat(log.rating)}
                                    <span className="text-muted-foreground/35">
                                      {"★".repeat(5 - log.rating)}
                                    </span>
                                  </span>
                                ) : null}
                                {log.fit.replace("-", " ")}
                              </span>
                              <span className="text-muted-foreground">
                                Intensity {log.relief}/5
                              </span>
                            </div>
                            {log.conditions.length > 0 && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                for {log.conditions.join(", ")}
                              </p>
                            )}
                            {log.note && (
                              <p className="mt-1.5 text-sm leading-6">
                                {log.note}
                              </p>
                            )}
                            <p className="mt-1.5 text-[11px] text-muted-foreground">
                              {formatDate(log.createdAt)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}

                {/* Community notes */}
                {community.length > 0 && (
                  <div>
                    <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <MessageCircle className="size-3.5 text-primary" />
                      Patient community notes
                    </p>
                    <ul className="space-y-2.5">
                      {community.map((note) => (
                        <li
                          key={note.id}
                          className="rounded-xl bg-background px-4 py-3"
                        >
                          <p className="text-sm leading-6">{note.note}</p>
                          <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                            {note.authorName} · {formatDate(note.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <p className="text-xs leading-5 text-muted-foreground">
        Reviews you write appear publicly on the strain's page. Toggle the lock
        to stay anonymous (shown as "A patient") or show your name. Reviews are
        not medical advice.
      </p>
    </div>
  );
}

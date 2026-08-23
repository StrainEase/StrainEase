import { useAuth } from "@/hooks/use-auth";
import { useAilments } from "@/hooks/use-ailments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FIND_HREF, HISTORY_HREF } from "@/lib/app-nav";
import { ailmentsEqual } from "@/lib/ailments";
import { CONDITIONS } from "@/lib/strain-ui";
import { cn } from "@/lib/utils";
import { Clock, LogOut, ShieldCheck, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

/**
 * Account settings modal. Display name, saved ailments (same
 * `users/{uid}` fields as iOS), and a link to past research.
 */
export function AccountSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, signOut } = useAuth();
  const ailments = useAilments();
  const [draftName, setDraftName] = useState("");
  const [draftAilments, setDraftAilments] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Seed drafts when the dialog opens, and re-sync name/ailments from
  // live sources while the dialog is open and the user hasn't edited yet.
  useEffect(() => {
    if (!open || !user) return;
    setDraftName(user.name);
    setDraftAilments(ailments.names.slice());
    setSavedAt(null);
  }, [open, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep draft ailments aligned with remote updates only when the user
  // hasn't made local changes (avoids clobbering an in-progress edit).
  useEffect(() => {
    if (!open) return;
    setDraftAilments((prev) =>
      ailmentsEqual(prev, ailments.names) ? ailments.names.slice() : prev,
    );
  }, [open, ailments.names]);

  if (!user) return null;

  const nameDirty =
    draftName.trim() !== "" && draftName.trim() !== user.name.trim();
  const ailmentsDirty = !ailmentsEqual(draftAilments, ailments.names);
  const dirty = nameDirty || ailmentsDirty;

  const toggleDraftAilment = (name: string) => {
    const key = name.trim().toLowerCase();
    setDraftAilments((prev) => {
      const on = prev.some((item) => item.toLowerCase() === key);
      return on
        ? prev.filter((item) => item.toLowerCase() !== key)
        : [...prev, name.trim()];
    });
    setSavedAt(null);
  };

  const save = async () => {
    if (!dirty) return;
    const name = draftName.trim();
    if (nameDirty && !name) return;
    setSaving(true);
    try {
      if (nameDirty) {
        const { updateProfile } = await import("firebase/auth");
        const { auth } = await import("@/lib/firebase");
        if (auth?.currentUser) {
          await updateProfile(auth.currentUser, { displayName: name });
        }
      }
      if (ailmentsDirty) {
        await ailments.save(draftAilments);
      }
      setSavedAt(Date.now());
    } catch (err) {
      console.error("Failed to save account settings", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-md overflow-y-auto border-border/70">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <User className="size-4 text-primary" />
            Account settings
          </DialogTitle>
          <DialogDescription>
            Update how your name appears on notes you share with other
            patients.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <label
              htmlFor="account-name"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Display name
            </label>
            <Input
              id="account-name"
              value={draftName}
              onChange={(e) => {
                setDraftName(e.target.value);
                setSavedAt(null);
              }}
              maxLength={80}
              autoComplete="name"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Shown next to notes you mark public on a strain&apos;s page.
            </p>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-background px-4 py-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-xs leading-5 text-muted-foreground">
              Your email is never shown publicly. Public notes display
              only the display name above.
            </p>
          </div>

          {savedAt !== null && !dirty && (
            <p className="text-xs text-primary">Settings saved.</p>
          )}

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Your ailments
              </p>
              {draftAilments.length > 0 && (
                <Link
                  to={FIND_HREF}
                  onClick={() => onOpenChange(false)}
                  className="text-xs font-semibold text-primary"
                >
                  Find for these
                </Link>
              )}
            </div>
            <p className="mb-2.5 text-xs text-muted-foreground">
              Saved so Find can jump back to them.
            </p>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((name) => {
                const on = draftAilments.some(
                  (item) => item.toLowerCase() === name.toLowerCase(),
                );
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleDraftAilment(name)}
                    className={cn(
                      "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium",
                      on
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/70 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          <Link
            to={HISTORY_HREF}
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background px-4 py-3"
          >
            <span>
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="size-3.5 text-primary" />
                Past research
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Reopen a find or comparison
              </span>
            </span>
          </Link>
        </div>

        <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer rounded-full text-muted-foreground hover:text-destructive"
            onClick={() => {
              void signOut();
              onOpenChange(false);
            }}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer rounded-full"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              className={cn(
                "cursor-pointer rounded-full transition-opacity",
                dirty && !saving
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "opacity-60",
              )}
              disabled={!dirty || saving || (nameDirty && draftName.trim() === "")}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

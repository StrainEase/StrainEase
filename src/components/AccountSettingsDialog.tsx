import { useAuth } from "@/hooks/use-auth";
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
import { LogOut, ShieldCheck, User } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Account settings modal. Triggered from the Profile menu in the
 * Dashboard header. The only writable field right now is the
 * display name (updated client-side via Firebase's
 * updateProfile). The form is intentionally short — future
 * per-user preferences (timezone, default conditions) will plug in
 * here without re-architecting.
 */
export function AccountSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, signOut } = useAuth();
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (open && user) setDraftName(user.name);
  }, [open, user]);

  if (!user) return null;

  const dirty = draftName.trim() !== user.name.trim();
  const save = async () => {
    const name = draftName.trim();
    if (!name || name === user.name) return;
    setSaving(true);
    try {
      const { updateProfile } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");
      if (auth?.currentUser) {
        await updateProfile(auth.currentUser, { displayName: name });
      }
      setSavedAt(Date.now());
    } catch (err) {
      // Surface as a dialog-level error if we ever wire toasts.
      console.error("Failed to update display name", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/70">
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

          {savedAt !== null && (
            <p className="text-xs text-primary">Display name updated.</p>
          )}
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
              className="cursor-pointer rounded-full"
              disabled={!dirty || saving || draftName.trim() === ""}
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
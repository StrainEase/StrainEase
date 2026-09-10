import { useAuth } from "@/hooks/use-auth";
import { useAilments } from "@/hooks/use-ailments";
import { useMedications } from "@/hooks/use-medications";
import { useThcSensitivity } from "@/hooks/use-thc-sensitivity";
import { useTriedStrains } from "@/hooks/use-tried-strains";
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
import { MedicationAutocomplete } from "@/components/ui/MedicationAutocomplete";
import { StrainAutocomplete } from "@/components/ui/StrainAutocomplete";
import { FIND_HREF, HISTORY_HREF } from "@/lib/app-nav";
import { ailmentsEqual } from "@/lib/ailments";
import {
  THC_SENSITIVITY_OPTIONS,
  type ThcSensitivity,
} from "@/lib/thc-sensitivity";
import { CONDITIONS } from "@/lib/strain-ui";
import { cn } from "@/lib/utils";
import { Clock, FileText, LogOut, Pill, Plus, ShieldCheck, Sparkles, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

/**
 * Account settings modal. Display name, saved ailments (same
 * `users/{uid}` fields as iOS), THC sensitivity (same field the
 * Kaya prompts read), and a link to past research.
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
  const medications = useMedications();
  const thcSensitivity = useThcSensitivity();
  const triedStrains = useTriedStrains();
  const [draftName, setDraftName] = useState("");
  const [draftAilments, setDraftAilments] = useState<string[]>([]);
  const [draftMedications, setDraftMedications] = useState<string[]>([]);
  const [draftThc, setDraftThc] = useState<ThcSensitivity | null>(null);
  const [draftTriedStrains, setDraftTriedStrains] = useState<
    { name: string; type: string; thc: string }[]
  >([]);
  const [newMedication, setNewMedication] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Seed drafts when the dialog opens, and re-sync name/ailments/THC/medications
  // from live sources while the dialog is open and the user hasn't
  // edited yet.
  useEffect(() => {
    if (!open || !user) return;
    setDraftName(user.name);
    setDraftAilments(ailments.names.slice());
    setDraftMedications(medications.names.slice());
    setDraftThc(thcSensitivity.value);
    setDraftTriedStrains(
      triedStrains.list.map((s) => ({
        name: s.name,
        type: s.type,
        thc: s.thc,
      })),
    );
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

  // Keep draft medications aligned with remote updates.
  useEffect(() => {
    if (!open) return;
    setDraftMedications((prev) =>
      prev.length === medications.names.length &&
      prev.every((m) => medications.names.includes(m))
        ? medications.names.slice()
        : prev,
    );
  }, [open, medications.names]);

  // Same idea for THC sensitivity: only resync when the user hasn't
  // picked something different locally.
  useEffect(() => {
    if (!open) return;
    setDraftThc((prev) => (prev === thcSensitivity.value ? prev : prev));
  }, [open, thcSensitivity.value]);

  if (!user) return null;

  const nameDirty =
    draftName.trim() !== "" && draftName.trim() !== user.name.trim();
  const ailmentsDirty = !ailmentsEqual(draftAilments, ailments.names);
  const medicationsDirty =
    draftMedications.length !== medications.names.length ||
    !draftMedications.every((m) => medications.names.includes(m));
  const thcDirty = draftThc !== thcSensitivity.value;
  const triedStrainsDirty = JSON.stringify(draftTriedStrains) !== JSON.stringify(
    triedStrains.list.map((s) => ({ name: s.name, type: s.type, thc: s.thc })),
  );
  const dirty =
    nameDirty || ailmentsDirty || thcDirty || triedStrainsDirty || medicationsDirty;

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

  const selectDraftThc = (next: ThcSensitivity | null) => {
    setDraftThc((prev) => (prev === next ? null : next));
    setSavedAt(null);
  };

  const addDraftMedication = () => {
    const name = newMedication.trim();
    if (!name) return;
    if (draftMedications.some((m) => m.toLowerCase() === name.toLowerCase())) {
      setNewMedication("");
      return;
    }
    setDraftMedications((prev) => [...prev, name]);
    setNewMedication("");
    setSavedAt(null);
  };

  const removeDraftMedication = (name: string) => {
    setDraftMedications((prev) =>
      prev.filter((m) => m.toLowerCase() !== name.toLowerCase()),
    );
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
      if (thcDirty) {
        await thcSensitivity.save(draftThc);
      }
      if (triedStrainsDirty) {
        // Sync tried strains: add new ones, remove deleted ones
        const currentStrainNames = new Set(
          triedStrains.list.map((s) => s.name.toLowerCase()),
        );
        const draftStrainNames = new Set(
          draftTriedStrains.map((s) => s.name.toLowerCase()),
        );
        // Add new strains
        for (const strain of draftTriedStrains) {
          if (!currentStrainNames.has(strain.name.toLowerCase())) {
            await triedStrains.add(strain);
          }
        }
        // Remove deleted strains
        for (const strain of triedStrains.list) {
          if (!draftStrainNames.has(strain.name.toLowerCase())) {
            await triedStrains.remove(strain.id);
          }
        }
      }
      if (medicationsDirty) {
        // Sync medications: add new ones, remove deleted ones
        const currentMedNames = new Set(medications.names.map((n) => n.toLowerCase()));
        const draftMedNames = new Set(
          draftMedications.map((n) => n.toLowerCase()),
        );
        // Add new medications
        for (const med of draftMedications) {
          if (!currentMedNames.has(med.toLowerCase())) {
            await medications.add(med);
          }
        }
        // Remove deleted medications
        for (const med of medications.list) {
          if (!draftMedNames.has(med.name.toLowerCase())) {
            await medications.remove(med.id);
          }
        }
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
            Update how your name appears on notes you share with other patients.
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
              Your email is never shown publicly. Public notes display only the
              display name above.
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

          {/* Medications section */}
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Pill className="size-3 text-primary" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Your medications
                </p>
              </div>
              {draftMedications.length > 0 && (
                <Link
                  to={FIND_HREF}
                  onClick={() => onOpenChange(false)}
                  className="text-xs font-semibold text-primary"
                >
                  Find with these
                </Link>
              )}
            </div>
            <p className="mb-2.5 text-xs text-muted-foreground">
              Saved so Find can consider them when suggesting strains.
            </p>

            {/* Add medication input */}
            <div className="mb-2.5 flex gap-2">
              <Input
                value={newMedication}
                onChange={(e) => setNewMedication(e.target.value)}
                placeholder="Add a medication (e.g. Lexapro)"
                className="h-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDraftMedication();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="cursor-pointer rounded-full"
                onClick={addDraftMedication}
              >
                <Plus className="size-4" />
              </Button>
            </div>

            {/* Saved medications */}
            {draftMedications.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {draftMedications.map((med) => (
                  <span
                    key={med}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                  >
                    {med}
                    <button
                      type="button"
                      onClick={() => removeDraftMedication(med)}
                      className="cursor-pointer rounded-full p-0.5 hover:bg-primary/20"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <Sparkles className="size-3 text-primary" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                THC sensitivity
              </p>
            </div>
            <p className="mb-2.5 text-xs text-muted-foreground">
              Calibrates the strain descriptions and recommendations Kaya
              writes for you. Pick the closest match, or leave it off to
              get the default read.
            </p>
            <div className="flex flex-col gap-2">
              {THC_SENSITIVITY_OPTIONS.map((opt) => {
                const on = draftThc === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => selectDraftThc(opt.value)}
                    aria-pressed={on}
                    className={cn(
                      "cursor-pointer rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                      on
                        ? "border-primary/40 bg-primary/10"
                        : "border-border/70 hover:border-primary/30",
                    )}
                  >
                    <span
                      className={cn(
                        "block text-sm font-semibold",
                        on ? "text-primary" : "text-foreground",
                      )}
                    >
                      {opt.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                      {opt.description}
                    </span>
                  </button>
                );
              })}
              {draftThc !== null && (
                <button
                  type="button"
                  onClick={() => selectDraftThc(null)}
                  className="self-start text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Clear selection
                </button>
              )}
            </div>
          </div>

          {/* Tried strains */}
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <Sparkles className="size-3 text-primary" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Other strains I&apos;ve tried
              </p>
            </div>
            <p className="mb-2.5 text-xs text-muted-foreground">
              Add strains you&apos;ve already tried so Kaya knows what worked and
              what didn&apos;t.
            </p>
            <StrainAutocomplete
              value={draftTriedStrains}
              onChange={setDraftTriedStrains}
              placeholder="Search strains you&apos;ve tried…"
            />
          </div>

          {/* Medications */}
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <Sparkles className="size-3 text-primary" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Other medications
              </p>
            </div>
            <p className="mb-2.5 text-xs text-muted-foreground">
              List prescription or OTC meds so Kaya can note interactions.
            </p>
            <MedicationAutocomplete
              value={draftMedications}
              onChange={setDraftMedications}
              placeholder="Add a medication…"
            />
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

          <Link
            to="/report"
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background px-4 py-3"
          >
            <span>
              <span className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-3.5 text-primary" />
                Generate clinician report
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Print or save as PDF for your doctor or pharmacist
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
              disabled={
                !dirty || saving || (nameDirty && draftName.trim() === "")
              }
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

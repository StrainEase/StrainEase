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
import { ArrowLeft, Heart } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Top header bar for the strain detail page. Mirrors the iOS
 * `StrainDetailView` toolbar (compare on the leading edge, strain
 * name in the middle, favorites on the trailing edge, plus a back
 * affordance just before compare) so both surfaces expose the same
 * actions in the same place.
 *
 *  - **Back** — icon only on narrow screens, icon + "Back" text on
 *    wide screens (the existing web convention).
 *  - **Compare** — circular icon-only button on the leading side.
 *    Idle shows the two-arrow compare glyph (one left, one right);
 *    selected shows a check. Three states (idle / in compare / full)
 *    match the inline CompareToggleButton.
 *  - **Favorites** — circular heart on the trailing side that
 *    toggles membership in the user's saved strains.
 *  - **Title** — strain name centered, only when the profile has
 *    arrived, so the bar does not reflow while the page is
 *    hydrating.
 */
export function StrainPageHeader({
  profile,
  isInCompare,
  compareAtCap,
  onToggleCompare,
  onBack,
}: {
  profile: StrainProfile | null;
  isInCompare: boolean;
  compareAtCap: boolean;
  onToggleCompare: () => void;
  onBack: () => void;
}) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        aria-label="Back"
      >
        <ArrowLeft className="size-4" />
        <span className="hidden sm:inline">Back</span>
      </button>
      <div className="min-w-0 text-center">
        {profile ? (
          <h1 className="truncate text-sm font-semibold text-foreground">
            {profile.name}
          </h1>
        ) : null}
      </div>
      {profile ? (
        <CompareIconButton
          isInSelection={isInCompare}
          isFull={compareAtCap}
          onToggle={onToggleCompare}
        />
      ) : (
        // Reserve the compare footprint so the bar does not jump
        // when the profile lands.
        <span
          aria-hidden
          className="size-9 rounded-full border border-border/70 bg-background"
        />
      )}
      {profile ? (
        <FavoritesButton profile={profile} />
      ) : (
        // Reserve the favorites footprint so the bar does not jump
        // when the profile lands.
        <span
          aria-hidden
          className="size-9 rounded-full border border-border/70 bg-background"
        />
      )}
    </div>
  );
}

function CompareIconButton({
  isInSelection,
  isFull,
  onToggle,
}: {
  isInSelection: boolean;
  isFull: boolean;
  onToggle: () => void;
}) {
  const title = isInSelection
    ? "Remove from compare"
    : isFull
      ? "Compare is full (3 strains)"
      : "Add to compare";
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (isFull && !isInSelection) return;
        onToggle();
      }}
      title={title}
      aria-label={title}
      aria-pressed={isInSelection}
      disabled={isFull && !isInSelection}
      className={cn(
        "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors",
        isInSelection
          ? "border-primary/40 bg-primary/10 text-primary"
          : isFull
            ? "cursor-not-allowed border-border/70 bg-background text-muted-foreground/60"
            : "border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-primary",
      )}
    >
      <CompareIcon isInSelection={isInSelection} />
    </button>
  );
}

function CompareIcon({ isInSelection }: { isInSelection: boolean }) {
  // Two states share the same circular footprint. Selected uses a
  // check inside the same circular outline; idle uses the two-
  // arrow compare glyph (one left, one right) that the iOS
  // StrainDetailView toolbar ships with. A full state still
  // renders the compare glyph but the parent disables the button.
  if (isInSelection) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M5 12l4 4L19 6" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Top arrow points left, bottom arrow points right. Stacked
          vertically inside the same square viewBox so the icon
          reads as "compare / swap" at the small 4×4 size. The
          arrows are spread toward the top/bottom edges of the
          box so there's a clear vertical gap between them. */}
      <path d="M4 5h12" />
      <path d="M12 1l4 4-4 4" />
      <path d="M20 19H8" />
      <path d="M12 23l-4-4 4-4" />
    </svg>
  );
}

function FavoritesButton({ profile }: { profile: StrainProfile }) {
  const { user, isAuthenticated } = useAuth();
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    if (!db || !user) {
      setSaved(false);
      setReady(true);
      return;
    }
    isStrainSaved(user.uid, slugify(profile.name))
      .then((on) => {
        if (!cancelled) {
          setSaved(on);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
    // user?.uid is sufficient: refreshing the auth listener doesn't
    // need to re-run when other user fields change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, profile.name]);

  if (!isAuthenticated || !db) return null;

  const toggle = async () => {
    if (!user || busy || !ready) return;
    // Snapshot the profile name so we don't apply this mutation to a
    // different strain if the user navigated away while Firestore resolved.
    const atName = profile.name;
    setBusy(true);
    try {
      if (saved) {
        await removeSavedStrain(user.uid, slugify(atName));
        if (profile.name === atName) setSaved(false);
      } else {
        await saveStrain(user.uid, profile);
        if (profile.name === atName) setSaved(true);
      }
    } catch {
      // Keep the previous state on failure so the icon does not
      // flash to a wrong "saved" or "unsaved" state.
    } finally {
      setBusy(false);
    }
  };

  const title = saved ? "Remove from saved strains" : "Save this strain";
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void toggle();
      }}
      title={title}
      aria-label={title}
      aria-pressed={saved}
      disabled={busy || !ready}
      className={cn(
        "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors",
        saved
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-primary",
        (busy || !ready) && "opacity-60",
      )}
    >
      <Heart
        className="size-4"
        strokeWidth={saved ? 2.2 : 2}
        fill={saved ? "currentColor" : "none"}
      />
    </button>
  );
}

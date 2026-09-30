import { useCompareSelection } from "@/hooks/use-compare-selection";
import { LONG_PRESS_MS, useLongPress } from "@/hooks/use-long-press";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * One-shot visual feedback the card overlays on its photo while the
 * hold is completing (`holding`) and right after it lands (`added`).
 */
export type LongPressFlash = "holding" | "added" | null;

/** How long the "added" ring stays on the card, in ms. */
const ADDED_FLASH_MS = 900;

export type CompareLongPress = {
  /** Gesture handlers to spread on the card wrapper element. */
  handlers: {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
    onClickCapture: (event: React.MouseEvent<HTMLElement>) => void;
    onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  };
  /** Visual feedback state for the card's photo overlay. */
  flash: LongPressFlash;
  /** True when this strain is already in the compare selection. */
  inCompare: boolean;
  /** True when the selection is at the cap (3 strains). */
  compareFull: boolean;
};

/**
 * Shared client feedback for "press and hold a strain card to add it to
 * the compare selection". Every strain-card surface (Home rails, the
 * ailment carousel, the Browse grid) runs its cards through this one
 * hook so the gesture, feedback, and toast copy stay identical.
 *
 * Cards show a pulsing ring while the hold is completing and a solid
 * ring for a beat after the strain lands in the tray. Adding speaks for
 * itself via toast + ring; removal stays an explicit tap on the tray
 * chip (and doesn't toast).
 */
export function useCompareLongPress(
  name: string,
  /** Hold duration in ms. Tests pass a small value; production uses the default. */
  delay = LONG_PRESS_MS,
): CompareLongPress {
  const selection = useCompareSelection();
  const [flash, setFlash] = useState<LongPressFlash>(null);
  const addedTimerRef = useRef<number | null>(null);

  const clearAddedTimer = useCallback(() => {
    if (addedTimerRef.current !== null) {
      window.clearTimeout(addedTimerRef.current);
      addedTimerRef.current = null;
    }
  }, []);

  const showAddedFlash = useCallback(() => {
    clearAddedTimer();
    setFlash("added");
    addedTimerRef.current = window.setTimeout(() => {
      addedTimerRef.current = null;
      setFlash(null);
    }, ADDED_FLASH_MS);
  }, [clearAddedTimer]);

  const handleLongPress = useCallback(() => {
    clearAddedTimer();
    const display = name.trim() || "This strain";
    if (selection.isIn(name)) {
      toast(`${display} is already in the compare tray`);
      return;
    }
    if (selection.atCap) {
      toast.error(
        `Compare tray is full (${selection.count}/${selection.cap})`,
        { description: `Long-press again after removing one from the tray.` },
      );
      return;
    }
    // `isIn` and `atCap` are pre-checked, so the add can't be rejected
    // by the hook's dedupe/cap rules.
    selection.add(name);
    showAddedFlash();
    // `selection` is the pre-add snapshot; the tray now holds one more.
    const countAfter = selection.count + 1;
    if (countAfter >= selection.cap) {
      toast.success(
        `${display} added — compare tray is full (${countAfter}/${selection.cap})`,
        { description: "Long-press a chip's × in the tray to swap it out." },
      );
    } else {
      toast.success(`${display} added to compare`, {
        description: `${countAfter} of ${selection.cap} — long-press another strain to add it.`,
      });
    }
  }, [clearAddedTimer, name, selection, showAddedFlash]);

  const handleLongPressCancel = useCallback(() => {
    setFlash((prev) => (prev === "holding" ? null : prev));
  }, []);

  const handleLongPressStart = useCallback(() => {
    setFlash("holding");
  }, []);

  const { onPointerDown, onClickCapture, onContextMenu } = useLongPress({
    onLongPress: handleLongPress,
    onLongPressStart: handleLongPressStart,
    onLongPressCancel: handleLongPressCancel,
    delay,
  });

  return {
    handlers: { onPointerDown, onClickCapture, onContextMenu },
    flash,
    inCompare: selection.isIn(name),
    compareFull: selection.atCap,
  };
}

/** Class names for the photo overlay ring, by flash state. */
export function longPressRingClass(flash: LongPressFlash): string | null {
  if (flash === "holding") {
    return "animate-pulse ring-2 ring-primary/70 ring-offset-2 ring-offset-background/40";
  }
  if (flash === "added") {
    return "ring-2 ring-primary ring-offset-2 ring-offset-background/40";
  }
  return null;
}

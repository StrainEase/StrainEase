import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * How long a press must be held before it counts as a long press.
 * 500ms matches the iOS long-press feel (and the native apps' haptic
 * timing) so the gesture reads the same on every platform.
 */
export const LONG_PRESS_MS = 500;

/** Max finger drift (px) before the hold is abandoned as a scroll/drag. */
const SLOP_PX = 8;

export type LongPressHandlers = {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onClickCapture: (event: React.MouseEvent<HTMLElement>) => void;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
};

/**
 * Press-and-hold gesture for strain cards, shared by every card surface.
 *
 * Attach the returned handlers to the element that wraps the card (it
 * may wrap a `<Link>` — the gesture never interferes with a plain tap,
 * which still navigates).
 *
 * Callback lifecycle:
 *  - `onLongPressStart` — a press that can arm the timer just landed.
 *  - `onLongPress` — the hold completed after `delay` ms.
 *  - `onLongPressCancel` — an armed hold was abandoned (finger moved
 *    beyond the slop, lifted early, or the system stole the pointer for
 *    a scroll).
 *
 * While the hold timer is armed, the release-time `click` is swallowed in
 * the capture phase, so a tap that is still resolving never navigates. Once
 * the hold fires, releasing the pointer still suppresses the release click —
 * the long-press gesture owns the release, so the card never navigates as the
 * tail of a hold that already added the strain to compare. A fresh tap (new
 * pointerdown + release with no long press in between) still navigates
 * normally.
 *
 * While a touch is held, `contextmenu` is suppressed (Android Chrome opens
 * a link context menu mid-hold); desktop right-click is left alone.
 *
 * Pointer Events only — no separate touch/mouse code paths. Mouse and touch
 * on every supported browser emit pointer events.
 */
export function useLongPress({
  onLongPress,
  onLongPressStart,
  onLongPressCancel,
  delay = LONG_PRESS_MS,
}: {
  onLongPress: () => void;
  /** Called when a press lands and arms the hold timer. */
  onLongPressStart?: () => void;
  /** Called when an armed hold is cancelled before firing. */
  onLongPressCancel?: () => void;
  /** Hold duration in ms. Tests pass a small value; production uses the default. */
  delay?: number;
}): LongPressHandlers {
  const timerRef = useRef<number | null>(null);
  const touchHeldRef = useRef(false);
  // True while the hold timer is armed (press down, not yet fired).
  const armedRef = useRef(false);
  // Becomes true when the hold timer fires for the current pointer.
  const longPressFiredRef = useRef(false);
  // Raised by `onEnd` when a long press fired; consumed by
  // `onClickCapture` to swallow the release click. Reset once the next
  // click is seen.
  const suppressClickRef = useRef(false);
  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    clearTimer();
    touchHeldRef.current = false;
    if (armedRef.current) {
      armedRef.current = false;
      onLongPressCancel?.();
    }
  }, [clearTimer, onLongPressCancel]);

  useEffect(() => cancel, [cancel]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      // Left button / touch / pen only. Ignore right-click and other buttons.
      if (event.button !== 0) return;
      cancel();
      touchHeldRef.current = event.pointerType !== "mouse";
      armedRef.current = true;
      onLongPressStart?.();

      const startX = event.clientX;
      const startY = event.clientY;

      const onMove = (e: PointerEvent) => {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) > SLOP_PX) {
          cancel();
        }
      };
      const onEnd = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
        if (longPressFiredRef.current) {
          suppressClickRef.current = true;
          longPressFiredRef.current = false;
        }
        cancel();
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);

      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        armedRef.current = false;
        longPressFiredRef.current = true;
        onLongPress();
        // Keep the move/up listeners attached (onEnd removes them) so the
        // eventual release cleans up.
      }, delay);
    },
    [cancel, delay, onLongPress, onLongPressStart],
  );

  const onClickCapture = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    // A long press just completed for this pointer; swallow the release
    // click so the card (often a <Link>) doesn't navigate as the tail of a
    // gesture that already added the strain to compare. `preventDefault`
    // alone isn't enough for react-router — stop the event too.
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const onContextMenu = useCallback((event: React.MouseEvent<HTMLElement>) => {
    // Android fires `contextmenu` mid-hold on links; suppress it while
    // a touch is down so the browser menu doesn't stomp the gesture.
    // Desktop right-click still opens the normal menu.
    if (touchHeldRef.current) {
      event.preventDefault();
    }
  }, []);

  return useMemo(
    () => ({ onPointerDown, onClickCapture, onContextMenu }),
    [onPointerDown, onClickCapture, onContextMenu],
  );
}

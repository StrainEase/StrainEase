import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * How long a press must be held before it counts as a long press.
 * 500ms matches the iOS long-press feel (and the native apps' haptic
 * timing) so the gesture reads the same on every platform.
 */
export const LONG_PRESS_MS = 500;

/** Max finger drift (px) before the hold is abandoned as a scroll/drag. */
const SLOP_PX = 8;

/**
 * Window (ms) after a long press fires during which the release-time
 * `click` is still swallowed. Real releases land 1–2 frames after the
 * timer; the window just guards against ordering surprises.
 */
const CLICK_SWALLOW_MS = 350;

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
 * After a hold fires, the release-time `click` is swallowed in the
 * capture phase, so the card never navigates on release. While a touch
 * is held, `contextmenu` is suppressed (Android Chrome opens a link
 * context menu mid-hold); desktop right-click is left alone.
 *
 * Pointer Events only — no separate touch/mouse code paths. Mouse and
 * touch on every supported browser emit pointer events.
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
  // Timestamp of the last fired hold; 0 when idle. The release-time
  // `click` is swallowed while `Date.now() - firedAt` is inside the
  // swallow window.
  const firedAtRef = useRef(0);

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
        cancel();
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);

      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        armedRef.current = false;
        firedAtRef.current = Date.now();
        onLongPress();
        // Keep the move/up listeners attached (onEnd removes them) so the
        // eventual release cleans up.
      }, delay);
    },
    [cancel, delay, onLongPress, onLongPressStart],
  );

  const onClickCapture = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (firedAtRef.current === 0) return;
    if (Date.now() - firedAtRef.current > CLICK_SWALLOW_MS) {
      firedAtRef.current = 0;
      return;
    }
    // The press just completed a long press: swallow the release click
    // so the card (often a <Link>) doesn't navigate. `preventDefault`
    // alone isn't enough for react-router — stop the event too.
    event.preventDefault();
    event.stopPropagation();
    firedAtRef.current = 0;
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

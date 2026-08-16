import { useEffect } from "react";

/**
 * Dismiss the soft keyboard when the user taps anywhere outside an editable
 * element. Without this, iOS Safari keeps the keyboard up after a field is
 * focused, because tapping a non-input surface does not blur the field.
 *
 * Behaviour:
 *   - tapping another <input>/<textarea>/<select> → no-op, let focus shift
 *     naturally between fields
 *   - tapping a button, chip, card, or any non-editable surface → blur the
 *     currently focused input/textarea so the keyboard dismisses
 *
 * `pointerdown` covers both touch and mouse, and fires before focus changes,
 * so the subsequent click handler on chips/buttons still runs.
 */
export function useDismissKeyboardOnOutsideTap() {
  useEffect(() => {
    const handler = (event: PointerEvent) => {
      const target = event.target as Element | null;
      const active = document.activeElement as HTMLElement | null;
      if (!target || !active) return;

      const targetEl = target as HTMLElement;

      // Don't steal focus when the user is moving between fields.
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        targetEl.isContentEditable
      ) {
        return;
      }

      // Only blur editable elements; leave buttons, links, etc. alone.
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement ||
        active.isContentEditable
      ) {
        active.blur();
      }
    };

    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);
}
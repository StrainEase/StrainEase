import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, renderHook } from "@testing-library/react";
import { LONG_PRESS_MS, useLongPress } from "./use-long-press";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Mount the hook via renderHook, then attach its handlers to a probe
 * element exactly the way cards do (`onPointerDown` etc. as props).
 * Returns the probe element plus the event log.
 */
function mountHarness(delay = LONG_PRESS_MS) {
  const events: string[] = [];
  const { result } = renderHook(() =>
    useLongPress({
      onLongPress: () => events.push("longpress"),
      onLongPressStart: () => events.push("start"),
      onLongPressCancel: () => events.push("cancel"),
      delay,
    }),
  );
  const handlers = result.current;

  const el = document.createElement("div");
  el.addEventListener("pointerdown", (e) =>
    handlers.onPointerDown(e as unknown as React.PointerEvent<HTMLElement>),
  );
  el.addEventListener("click", (e) => handlers.onClickCapture(e), true);
  el.addEventListener("contextmenu", (e) => handlers.onContextMenu(e));
  document.body.appendChild(el);

  return { events, el };
}

function pointerDownOn(
  el: HTMLElement,
  init: PointerEventInit = { button: 0, pointerType: "touch" },
) {
  el.dispatchEvent(
    new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      clientX: 10,
      clientY: 10,
      ...init,
    }),
  );
}

describe("useLongPress", () => {
  test("has a 500ms hold to match the native apps", () => {
    expect(LONG_PRESS_MS).toBe(500);
  });

  test("fires after holding for the delay", async () => {
    const { events, el } = mountHarness(20);
    pointerDownOn(el);
    expect(events).toEqual(["start"]);
    await wait(40);
    expect(events).toEqual(["start", "longpress"]);
  });

  test("cancels when the pointer lifts before the delay", async () => {
    const { events, el } = mountHarness(20);
    pointerDownOn(el);
    await wait(5);
    window.dispatchEvent(new PointerEvent("pointerup"));
    await wait(40);
    expect(events).toEqual(["start", "cancel"]);
  });

  test("cancels when the finger drifts beyond the slop", async () => {
    const { events, el } = mountHarness(20);
    pointerDownOn(el);
    await wait(5);
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 40, clientY: 10 }),
    );
    await wait(40);
    expect(events).toEqual(["start", "cancel"]);
  });

  test("cancels on pointercancel (system scroll steal)", async () => {
    const { events, el } = mountHarness(20);
    pointerDownOn(el);
    await wait(5);
    window.dispatchEvent(new PointerEvent("pointercancel"));
    await wait(40);
    expect(events).toEqual(["start", "cancel"]);
  });

  test("ignores non-primary buttons", async () => {
    const { events, el } = mountHarness(20);
    pointerDownOn(el, { button: 2, pointerType: "mouse" });
    await wait(40);
    expect(events).toEqual([]);
  });

  test("swallows the release click right after a hold fires", async () => {
    const { events, el } = mountHarness(20);
    pointerDownOn(el);
    await wait(40); // hold fires
    expect(events).toEqual(["start", "longpress"]);

    const link = document.createElement("a");
    el.appendChild(link);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
  });

  test("lets clicks through when no hold fired", () => {
    const { el } = mountHarness(20);
    const link = document.createElement("a");
    el.appendChild(link);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
  });

  test("suppresses contextmenu during a touch hold but not on mouse right-click", () => {
    const { el } = mountHarness(20);
    pointerDownOn(el); // touch pointer is down
    const touchMenu = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    el.dispatchEvent(touchMenu);
    expect(touchMenu.defaultPrevented).toBe(true);

    pointerDownOn(el, { button: 0, pointerType: "mouse" });
    const mouseMenu = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    el.dispatchEvent(mouseMenu);
    expect(mouseMenu.defaultPrevented).toBe(false);
    window.dispatchEvent(new PointerEvent("pointerup"));
  });
});

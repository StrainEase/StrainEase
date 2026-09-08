import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ComparableStrainPoster } from "@/components/strain/ComparableStrainPoster";
import {
  COMPARE_STORAGE_KEY,
} from "@/hooks/use-compare-selection";
import type { StrainProfile } from "@/lib/strain-profile";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  document.body.innerHTML = "";
});

const baseProfile: StrainProfile = {
  name: "Granddaddy Purple",
  inKnowledgeBase: true,
  type: "indica",
  thcRange: "17-23%",
  medicalUses: ["Insomnia"],
  terpenes: [],
  leaflyRating: 4.6,
};

function poster(profile: StrainProfile = baseProfile) {
  return render(
    <MemoryRouter>
      <ComparableStrainPoster profile={profile} />
    </MemoryRouter>,
  );
}

/** Grab the gesture-bearing wrapper span (the poster's parent). */
function wrapperEl(container: HTMLElement): HTMLElement {
  const link = container.querySelector("a");
  if (!link) throw new Error("poster link not rendered");
  return link.parentElement as HTMLElement;
}

function pressDown(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        button: 0,
        pointerType: "touch",
        clientX: 10,
        clientY: 10,
      }),
    );
  });
}

function release() {
  act(() => {
    window.dispatchEvent(new PointerEvent("pointerup"));
  });
}

describe("ComparableStrainPoster long-press to compare", () => {
  test("a quick tap does not touch the compare selection", async () => {
    const { container } = poster();
    const el = wrapperEl(container);
    pressDown(el);
    release();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(sessionStorage.getItem(COMPARE_STORAGE_KEY)).toBeNull();
  });

  test("press and hold adds the strain to the compare selection", async () => {
    const { container } = poster();
    const el = wrapperEl(container);
    pressDown(el);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });
    release();
    const stored = sessionStorage.getItem(COMPARE_STORAGE_KEY);
    expect(stored).toBe("Granddaddy Purple");
    // The in-compare badge appears on the card.
    expect(
      container.querySelector("[title='In the compare tray']"),
    ).toBeTruthy();
  });

  test("holding a second card accumulates the selection", async () => {
    const first = poster();
    const firstEl = wrapperEl(first.container);
    pressDown(firstEl);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });
    release();
    expect(sessionStorage.getItem(COMPARE_STORAGE_KEY)).toBe(
      "Granddaddy Purple",
    );

    const second: StrainProfile = { ...baseProfile, name: "Blue Dream" };
    const secondRender = render(
      <MemoryRouter>
        <ComparableStrainPoster profile={second} />
      </MemoryRouter>,
    );

    const el = wrapperEl(secondRender.container);
    pressDown(el);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });
    release();

    expect(sessionStorage.getItem(COMPARE_STORAGE_KEY)).toBe(
      "Granddaddy Purple,Blue Dream",
    );
  });

  test("a cancelled hold (early release) never mutates the selection", async () => {
    const { container } = poster();
    const el = wrapperEl(container);
    pressDown(el);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    release();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });
    expect(sessionStorage.getItem(COMPARE_STORAGE_KEY)).toBeNull();
  });

  test("the in-compare badge marks cards already in the selection", () => {
    sessionStorage.setItem(COMPARE_STORAGE_KEY, "Granddaddy Purple");
    const { container } = poster();
    expect(
      container.querySelector("[title='In the compare tray']"),
    ).toBeTruthy();
  });

  test("clean cards do not show the in-compare badge", () => {
    const { container } = poster();
    expect(container.querySelector("[title='In the compare tray']")).toBeNull();
  });
});

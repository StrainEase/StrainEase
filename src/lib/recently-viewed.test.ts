import { describe, expect, test } from "bun:test";
import { recordRecentlyViewed } from "./recently-viewed";

describe("recordRecentlyViewed", () => {
  test("does not throw when localStorage.setItem fails", () => {
    const fake = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };
    const previousWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window: unknown }).window = {
      localStorage: fake,
      dispatchEvent: () => true,
    };
    try {
      expect(() =>
        recordRecentlyViewed({ name: "Blue Dream", inKnowledgeBase: true }),
      ).not.toThrow();
    } finally {
      (globalThis as { window?: unknown }).window = previousWindow;
    }
  });
});

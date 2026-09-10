import { describe, expect, test } from "bun:test";
import {
  APP_NAV,
  dashboardModeFromSearch,
  dashboardTab,
} from "./app-nav";

describe("dashboardModeFromSearch", () => {
  test("maps known modes and defaults to find", () => {
    expect(dashboardModeFromSearch("directory")).toBe("directory");
    expect(dashboardModeFromSearch("compare")).toBe("compare");
    expect(dashboardModeFromSearch("history")).toBe("history");
    expect(dashboardModeFromSearch("checkins")).toBe("checkins");
    // "saved" used to be a dashboard mode; it now lives in the
    // heart-button modal so URLs with ?mode=saved fall through
    // to the default find view.
    expect(dashboardModeFromSearch("saved")).toBe("find");
    expect(dashboardModeFromSearch(null)).toBe("find");
    expect(dashboardModeFromSearch("nope")).toBe("find");
  });
});

describe("dashboardTab", () => {
  test("only find and browse light a tab", () => {
    expect(dashboardTab("find")).toBe("find");
    expect(dashboardTab("directory")).toBe("directory");
    expect(dashboardTab("compare")).toBeUndefined();
    expect(dashboardTab("history")).toBeUndefined();
  });
});

describe("APP_NAV", () => {
  test("matches the iOS tab order", () => {
    expect(APP_NAV.map((item) => item.id)).toEqual([
      "home",
      "find",
      "directory",
      "doctors",
    ]);
  });
});

import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AppTabBar } from "./AppHeader";

describe("AppTabBar", () => {
  test("renders the four iOS tabs and marks the active one", () => {
    render(
      <MemoryRouter>
        <AppTabBar active="find" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe(
      "/",
    );
    expect(screen.getByRole("link", { name: "Find" }).getAttribute("href")).toBe(
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: "Browse" }).getAttribute("href")).toBe(
      "/dashboard?mode=directory",
    );
    expect(
      screen.getByRole("link", { name: "Doctors" }).getAttribute("href"),
    ).toBe("/doctors");
    expect(
      screen.getByRole("link", { name: "Find" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: "Home" }).getAttribute("aria-current"),
    ).toBeNull();
  });
});

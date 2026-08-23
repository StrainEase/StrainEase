import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { StrainDirectory, DirectoryGridSkeleton } from "./StrainDirectory";

afterEach(() => {
  cleanup();
});

describe("StrainDirectory hydration", () => {
  test("DirectoryGridSkeleton renders the requested number of card placeholders", () => {
    render(
      <MemoryRouter>
        <DirectoryGridSkeleton count={6} />
      </MemoryRouter>,
    );
    const skeleton = screen.getByTestId("directory-grid-skeleton");
    const cards = skeleton.querySelectorAll(":scope > div");
    // 6 cards rendered.
    expect(cards.length).toBe(6);
    // Each card has 4 skeleton-line elements (photo, title, meta, button).
    const lines = skeleton.querySelectorAll(".skeleton-line");
    expect(lines.length).toBe(24);
  });

  test("DirectoryGridSkeleton defaults to 6 cards when count is omitted", () => {
    render(
      <MemoryRouter>
        <DirectoryGridSkeleton />
      </MemoryRouter>,
    );
    const skeleton = screen.getByTestId("directory-grid-skeleton");
    const cards = skeleton.querySelectorAll(":scope > div");
    expect(cards.length).toBe(6);
  });

  test("DirectoryGridSkeleton respects a custom count", () => {
    render(
      <MemoryRouter>
        <DirectoryGridSkeleton count={3} />
      </MemoryRouter>,
    );
    const skeleton = screen.getByTestId("directory-grid-skeleton");
    const cards = skeleton.querySelectorAll(":scope > div");
    expect(cards.length).toBe(3);
  });

  test(
    "StrainDirectory shows the filter strip and search bar even before the catalog loads",
    () => {
      // We can't easily mock the `browseStrains` network call from
      // here without setting up firebase-mock. The page mounts with
      // `allPreviews === null`, so the filter strip should be present
      // and the grid skeleton should be visible too.
      render(
        <MemoryRouter>
          <StrainDirectory />
        </MemoryRouter>,
      );
      expect(screen.getByPlaceholderText("Filter by name…")).toBeTruthy();
      // The "All types" button is in the type filter row.
      expect(screen.getByRole("button", { name: "All types" })).toBeTruthy();
      // Skeleton grid is rendered while previews are loading.
      expect(screen.getByTestId("directory-grid-skeleton")).toBeTruthy();
    },
  );
});

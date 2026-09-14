import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, mock, test } from "bun:test";
import { MemoryRouter } from "react-router";
import type { StrainPreview } from "@/lib/strain-api";
import * as strainApi from "@/lib/strain-api";

const PREVIEW: StrainPreview = {
  name: "Blue Dream",
  slug: "blue-dream",
  type: "hybrid",
  thcRange: "17-24%",
  imageUrl: "https://example.com/blue-dream.jpg",
  leaflyRating: 4.3,
  effects: [{ name: "Relaxed" }, { name: "Happy" }],
  medicalUses: [{ name: "Chronic pain" }],
};

const PREVIEW_2: StrainPreview = {
  name: "Northern Lights",
  slug: "northern-lights",
  type: "indica",
  thcRange: "16-21%",
  imageUrl: "https://example.com/northern-lights.jpg",
  leaflyRating: 4.6,
  effects: [{ name: "Sleepy" }],
  medicalUses: [{ name: "Insomnia" }],
};

// Re-export every name from the real module so transitive consumers
// (the strain-image hook, etc.) keep resolving their imports. Only
// `browseStrains` is overridden for the catalog fixture.
mock.module("@/lib/strain-api", () => ({
  ...strainApi,
  browseStrains: () =>
    Promise.resolve({
      previews: [PREVIEW, PREVIEW_2],
      totalCount: 500,
      offset: 0,
      fetchedAt: Date.now(),
    }),
}));

// Side-effect import: must come after mock.module so the mock is wired
// before the component tree resolves the module.
const { StrainDirectory } = await import("./StrainDirectory");

afterEach(() => {
  cleanup();
});

describe("StrainDirectory populated state", () => {
  test("renders the catalog in a 2-column grid that mirrors the browse rails", async () => {
    render(
      <MemoryRouter>
        <StrainDirectory />
      </MemoryRouter>,
    );

    // Each preview card links to its strain page. The grid wrapper
    // must use the same 2-column layout as the home / browse rails
    // (`StrainGrid`) so cards line up across surfaces.
    const links = await screen.findAllByRole("link", {
      name: /blue dream|northern lights/i,
    });
    expect(links.length).toBe(2);
    expect(links[0].getAttribute("href")).toBe("/strain/blue-dream");
    expect(links[1].getAttribute("href")).toBe("/strain/northern-lights");

    const grid = links[0].parentElement as HTMLElement;
    expect(grid.className).toContain("grid-cols-2");
  });

  test("the entire card is a single Link — no separate View button", async () => {
    render(
      <MemoryRouter>
        <StrainDirectory />
      </MemoryRouter>,
    );

    await screen.findByRole("link", { name: /blue Dream/i });

    // No card-level "View" buttons should be rendered — the whole card
    // is a Link now, so tapping anywhere opens the strain page.
    expect(screen.queryByRole("link", { name: /^view$/i })).toBeNull();
  });

  test("Load more hides when filters yield no matches", async () => {
    render(
      <MemoryRouter>
        <StrainDirectory />
      </MemoryRouter>,
    );

    await screen.findByRole("link", { name: /blue Dream/i });

    // Narrow the filter to a strain that doesn't exist in the loaded
    // previews so filtered.length drops to zero.
    const search = screen.getByPlaceholderText("Search the catalog");
    fireEvent.change(search, { target: { value: "zzz-no-such-strain-zzz" } });

    // Wait for the empty-state copy to render after the filter applies.
    await waitFor(() =>
      expect(screen.getByText(/no strains match/i)).toBeTruthy(),
    );

    // "X remaining" would be misleading here — every page beyond the
    // first 2 was unfiltered catalog, so showing Load more under an
    // empty filtered grid would invite the user to keep paging.
    expect(screen.queryByRole("button", { name: /load more/i })).toBeNull();
  });

  test("Load more stays visible when filters still match", async () => {
    render(
      <MemoryRouter>
        <StrainDirectory />
      </MemoryRouter>,
    );

    await screen.findByRole("link", { name: /blue Dream/i });

    // Both previews are loaded and totalCount=500, so the catalog is
    // not exhausted and the button should be present.
    expect(screen.getByRole("button", { name: /load more/i })).toBeTruthy();
  });
});

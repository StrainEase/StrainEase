import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, mock, test } from "bun:test";
import { MemoryRouter } from "react-router";
import type { BrowseCatalogPage, StrainPreview } from "@/lib/strain-api";
import * as strainApi from "@/lib/strain-api";

/**
 * 30 previews → after the directory streams the catalog in (it
 * keeps paging until `previews.length === totalCount`) we end up
 * with 30 cards in state. UI pagination caps the visible window at
 * 24, so the "Load more" affordance appears only when there's
 * something left to slice into.
 */
const PREVIEWS: StrainPreview[] = Array.from({ length: 30 }, (_, i) => ({
  name: i === 0 ? "Blue Dream" : i === 1 ? "Northern Lights" : `Strain ${i}`,
  slug: i === 0
    ? "blue-dream"
    : i === 1
      ? "northern-lights"
      : `strain-${i}`,
  type: i % 3 === 0 ? "indica" : i % 3 === 1 ? "sativa" : "hybrid",
  thcRange: i % 4 === 0 ? "12-15%" : i % 4 === 1 ? "18-22%" : i % 4 === 2 ? "24-28%" : "<1%",
  imageUrl: `https://example.com/${i}.jpg`,
  leaflyRating: 4 + (i % 5) / 10,
  effects: [{ name: i % 2 === 0 ? "Relaxed" : "Happy" }],
  medicalUses: [{ name: i % 2 === 0 ? "Chronic pain" : "Insomnia" }],
}));

const TOTAL_COUNT = PREVIEWS.length;

/** Mock that returns the same page on every call, then signals "drained"
 *  via totalCount === previews.length so the directory's auto-pagination
 *  loop terminates cleanly. Mirrors the production contract. */
function fakeBrowseStrains(args: {
  offset?: number;
  limit?: number;
}): Promise<BrowseCatalogPage> {
  const offset = args.offset ?? 0;
  const limit = args.limit ?? PREVIEWS.length;
  const slice = PREVIEWS.slice(offset, offset + limit);
  return Promise.resolve({
    previews: slice,
    totalCount: TOTAL_COUNT,
    offset,
    fetchedAt: Date.now(),
  });
}

// Re-export every name from the real module so transitive consumers
// (the strain-image hook, etc.) keep resolving their imports. Only
// `browseStrains` is overridden for the catalog fixture.
mock.module("@/lib/strain-api", () => ({
  ...strainApi,
  browseStrains: fakeBrowseStrains,
}));

// Side-effect import: must come after mock.module so the mock is wired
// before the component tree resolves the module.
const { StrainFind } = await import("./StrainFind");

afterEach(() => {
  cleanup();
});

describe("StrainFind populated state", () => {
  test("renders the catalog in a 2-column grid on phones, 3 cols at lg", async () => {
    render(
      <MemoryRouter>
        <StrainFind />
      </MemoryRouter>,
    );

    // Blue Dream and Northern Lights are the first two previews, so
    // they should always be visible after the catalog streams in.
    const links = await screen.findAllByRole("link", {
      name: /blue dream|northern lights/i,
    });
    expect(links.length).toBe(2);
    expect(links[0].getAttribute("href")).toBe("/strain/blue-dream");
    expect(links[1].getAttribute("href")).toBe("/strain/northern-lights");

    const grid = links[0].parentElement as HTMLElement;
    // Default to 2 columns starting at the smallest viewport, drop
    // the sm: breakpoint, keep the 3-column layout on lg+ so the
    // desktop directory can show more cards per row.
    expect(grid.className).toContain("grid-cols-2");
    expect(grid.className).toContain("lg:grid-cols-3");
  });

  test("the entire card is a single Link — no separate View button", async () => {
    render(
      <MemoryRouter>
        <StrainFind />
      </MemoryRouter>,
    );

    await screen.findByRole("link", { name: /blue Dream/i });

    // No card-level "View" buttons should be rendered — the whole card
    // is a Link now, so tapping anywhere opens the strain page.
    expect(screen.queryByRole("link", { name: /^view$/i })).toBeNull();
  });

  test("filters against the fully-loaded catalog, not just the first page", async () => {
    // The directory now drains the entire catalog before applying
    // filters, so picking "Insomnia" should surface every strain whose
    // `medicalUses` includes it — not just whichever ones happened to
    // land on page one. That's the fix for the "Commonly used for
    // doesn't work" complaint.
    render(
      <MemoryRouter>
        <StrainFind />
      </MemoryRouter>,
    );

    // Wait for the catalog to finish streaming in.
    await waitFor(() =>
      expect(screen.getAllByRole("link").length).toBe(24),
    );

    // Filter to "Insomnia". With our fixture, every odd-indexed preview
    // advertises "Insomnia" in `medicalUses`. After applying the filter
    // the directory must show those, not the page-one-only set.
    const insomniaChip = screen.getByRole("button", { name: "Insomnia" });
    fireEvent.click(insomniaChip);

    await waitFor(() => {
      const links = screen.queryAllByRole("link");
      // Every visible card links to a strain page, so the visible
      // strain count equals the link count. None of the visible
      // links should be the page-one-only "Blue Dream" (which
      // advertises "Chronic pain", not "Insomnia").
      const names = links.map(
        (l) => l.getAttribute("href") ?? "",
      );
      expect(names).not.toContain("/strain/blue-dream");
      expect(links.length).toBeGreaterThan(0);
    });
  });

  test("Load more hides when filters yield no matches", async () => {
    render(
      <MemoryRouter>
        <StrainFind />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getAllByRole("link").length).toBe(24),
    );

    // Narrow the filter to a strain that doesn't exist in the loaded
    // previews so filtered.length drops to zero.
    const search = screen.getByPlaceholderText("Search the catalog");
    fireEvent.change(search, { target: { value: "zzz-no-such-strain-zzz" } });

    // Wait for the empty-state copy to render after the filter applies.
    await waitFor(() =>
      expect(screen.getByText(/no strains match/i)).toBeTruthy(),
    );

    // UI Load more would invite the user to page through rows that
    // can't match their filter, so we hide it under an empty grid.
    expect(screen.queryByRole("button", { name: /load more/i })).toBeNull();
  });

  test("UI Load more shows when the filtered set exceeds one page", async () => {
    render(
      <MemoryRouter>
        <StrainFind />
      </MemoryRouter>,
    );

    // Catalog fully drained, first 24 cards visible.
    await waitFor(() =>
      expect(screen.getAllByRole("link").length).toBe(24),
    );

    // The fixture has 30 strains total and no filter is active, so
    // 30 match the filter and the UI slice is 24 — Load more must
    // appear to reveal the remaining 6.
    const loadMore = screen.getByRole("button", { name: /load more/i });
    expect(loadMore).toBeTruthy();

    // Clicking it reveals the rest of the catalog.
    fireEvent.click(loadMore);
    await waitFor(() => expect(screen.getAllByRole("link").length).toBe(30));

    // No more left → the button hides.
    expect(screen.queryByRole("button", { name: /load more/i })).toBeNull();
  });
});

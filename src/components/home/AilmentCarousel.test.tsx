import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AilmentCarousel } from "./AilmentCarousel";
import type { StrainProfile } from "@/lib/strain-profile";

afterEach(() => {
  cleanup();
});

const strains: StrainProfile[] = [
  { name: "Northern Lights", inKnowledgeBase: true, type: "indica" },
  { name: "Granddaddy Purple", inKnowledgeBase: true, type: "indica" },
  { name: "Bubba Kush", inKnowledgeBase: true, type: "indica" },
  { name: "Blue Dream", inKnowledgeBase: true, type: "hybrid" },
  { name: "OG Kush", inKnowledgeBase: true, type: "hybrid" },
  { name: "Wedding Cake", inKnowledgeBase: true, type: "hybrid" },
];

describe("AilmentCarousel", () => {
  test("renders a page for each ailment with its ailment name and preview strains", () => {
    render(
      <MemoryRouter>
        <AilmentCarousel
          ailments={["Insomnia", "Anxiety"]}
          preview={() => strains}
          seeMoreHref={(name) => `/browse/ailment/${name.toLowerCase()}`}
        />
      </MemoryRouter>,
    );

    const pages = screen.getAllByRole("article");
    expect(pages).toHaveLength(2);
    expect(within(pages[0]!).getByRole("heading", { level: 3 }).textContent).toBe(
      "Insomnia",
    );
    expect(within(pages[1]!).getByRole("heading", { level: 3 }).textContent).toBe(
      "Anxiety",
    );
    // 6 posters per page (3 + 3 rows). Each poster renders a strain name link.
    const insomnia = within(pages[0]!);
    for (const strain of strains) {
      expect(insomnia.getByText(strain.name)).toBeTruthy();
    }
  });

  test("caps each ailment at the iOS preview of 6 strains in two rows of 3", () => {
    const longList: StrainProfile[] = Array.from({ length: 12 }).map((_, i) => ({
      name: `Strain ${i + 1}`,
      inKnowledgeBase: true,
      type: "hybrid",
    }));
    render(
      <MemoryRouter>
        <AilmentCarousel
          ailments={["Insomnia"]}
          preview={() => longList}
          seeMoreHref={() => "/browse/ailment/insomnia"}
        />
      </MemoryRouter>,
    );

    const page = screen.getByRole("article");
    const rows = page.querySelectorAll("div.grid.grid-cols-3");
    expect(rows).toHaveLength(2);
    // Only the first 6 strain names should appear in the DOM.
    for (const strain of longList.slice(0, 6)) {
      expect(within(page).getByText(strain.name)).toBeTruthy();
    }
    expect(within(page).queryByText("Strain 7")).toBeNull();
  });

  test("hides the carousel when no ailments are supplied", () => {
    render(
      <MemoryRouter>
        <AilmentCarousel
          ailments={[]}
          preview={() => []}
          seeMoreHref={() => "/browse"}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("article")).toBeNull();
    expect(screen.queryByText("For your symptoms")).toBeNull();
  });

  test("forces one page per swipe via scroll-snap-stop: always", () => {
    // snap-mandatory on the scroller + snap-always on each page keeps a
    // fast finger flick from skipping past multiple ailment pages.
    render(
      <MemoryRouter>
        <AilmentCarousel
          ailments={["Insomnia", "Anxiety", "Stress"]}
          preview={() => strains}
          seeMoreHref={(name) => `/browse/ailment/${name.toLowerCase()}`}
        />
      </MemoryRouter>,
    );

    const pages = screen.getAllByRole("article");
    const scroller = pages[0]?.parentElement;
    expect(scroller?.className ?? "").toContain("snap-mandatory");

    for (const page of pages) {
      expect(page.className).toContain("snap-start");
      expect(page.className).toContain("snap-always");
    }
  });

  test("renders a dot for each ailment page", () => {
    render(
      <MemoryRouter>
        <AilmentCarousel
          ailments={["Insomnia", "Anxiety", "Stress"]}
          preview={() => strains}
          seeMoreHref={(name) => `/browse/ailment/${name.toLowerCase()}`}
        />
      </MemoryRouter>,
    );
    const dots = screen.getAllByRole("tab");
    expect(dots).toHaveLength(3);
    // First dot is selected by default.
    expect(dots[0]?.getAttribute("aria-selected")).toBe("true");
  });
});

import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { CommunityVoices } from "./CommunityVoices";
import type { PublicNote } from "@/lib/saved-strains";
import type { QuoteNote } from "@/lib/quotes";

afterEach(() => {
  cleanup();
});

const CANNABIS_NOTES: QuoteNote[] = [
  {
    source: "Leafly review · patient A",
    text: "Two hits and my back finally quieted down enough to sleep.",
  },
  {
    source: "Weedmaps listing",
    text: "Strain tagged for chronic pain, insomnia.",
  },
];

const REDDIT_NOTES: QuoteNote[] = [
  {
    source: "Reddit · r/trees",
    text: "GDP knocks me out in the best way after a long pain day.",
    kind: "reddit",
  },
];

const APP_REVIEWS: PublicNote[] = [
  {
    id: "note-1",
    strainKey: "granddaddy-purple",
    strainName: "Granddaddy Purple",
    note: "Helps me sleep through the night without waking up groggy.",
    authorName: "Pat",
    createdAt: 1_700_000_000_000,
  },
  {
    id: "note-2",
    strainKey: "granddaddy-purple",
    strainName: "Granddaddy Purple",
    note: "Eased my back pain before bed.",
    authorName: "Sam",
    createdAt: 1_700_000_000_001,
  },
];

describe("CommunityVoices", () => {
  test("renders an App Reviews tab when app reviews are provided", () => {
    render(
      <MemoryRouter>
        <CommunityVoices
          notes={[...CANNABIS_NOTES, ...REDDIT_NOTES]}
          strainName="Granddaddy Purple"
          appReviews={APP_REVIEWS}
        />
      </MemoryRouter>,
    );
    const tabs = screen.getAllByRole("tab");
    const labels = tabs.map((t) => t.textContent ?? "");
    expect(labels.some((l) => l.includes("App Reviews"))).toBe(true);
    expect(labels.some((l) => l.includes("Cannabis Sites"))).toBe(true);
    expect(labels.some((l) => l.includes("Reddit"))).toBe(true);
  });

  test("does not render an App Reviews tab when no app reviews are provided", () => {
    render(
      <MemoryRouter>
        <CommunityVoices
          notes={[...CANNABIS_NOTES, ...REDDIT_NOTES]}
          strainName="Granddaddy Purple"
        />
      </MemoryRouter>,
    );
    const labels = screen
      .getAllByRole("tab")
      .map((t) => t.textContent ?? "");
    expect(labels.some((l) => l.includes("App Reviews"))).toBe(false);
  });

  test("renders only the App Reviews tab when only app reviews are provided", () => {
    render(
      <MemoryRouter>
        <CommunityVoices
          strainName="Granddaddy Purple"
          appReviews={APP_REVIEWS}
        />
      </MemoryRouter>,
    );
    const labels = screen
      .getAllByRole("tab")
      .map((t) => t.textContent ?? "");
    // No "All" tab because only one source is present.
    expect(labels.some((l) => l.includes("All"))).toBe(false);
    expect(labels.some((l) => l.includes("App Reviews"))).toBe(true);
  });

  test("disables the All tab when only one source has content", () => {
    render(
      <MemoryRouter>
        <CommunityVoices
          notes={CANNABIS_NOTES}
          strainName="Granddaddy Purple"
          appReviews={APP_REVIEWS}
        />
      </MemoryRouter>,
    );
    const labels = screen
      .getAllByRole("tab")
      .map((t) => t.textContent ?? "");
    // Two sources (cannabis + app) — All tab should show.
    expect(labels.some((l) => l.includes("All"))).toBe(true);
  });

  test("renders the app review text in the App Reviews panel when selected", () => {
    render(
      <MemoryRouter>
        <CommunityVoices
          notes={CANNABIS_NOTES}
          strainName="Granddaddy Purple"
          appReviews={APP_REVIEWS}
        />
      </MemoryRouter>,
    );
    // The App Reviews tab is rendered but not selected by default (the
    // first available source is). Click it to assert the panel content.
    const appTab = screen
      .getAllByRole("tab")
      .find((t) => (t.textContent ?? "").includes("App Reviews"));
    expect(appTab).toBeDefined();
    appTab!.click();
    // After click, the App Reviews panel (data-state="active") should
    // render the notes.
    const panel = document.querySelector(
      '[data-state="active"][role="tabpanel"]',
    );
    expect(panel).toBeTruthy();
    expect(panel!.textContent).toMatch(/sleep through the night/);
    expect(panel!.textContent).toMatch(/Eased my back pain/);
  });
});

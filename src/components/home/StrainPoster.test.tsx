import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { StrainPoster } from "./StrainPoster";
import type { StrainProfile } from "@/lib/strain-profile";

afterEach(() => {
  cleanup();
});

const baseProfile: StrainProfile = {
  name: "Granddaddy Purple",
  inKnowledgeBase: true,
  type: "indica",
  thcRange: "17-23%",
  medicalUses: ["Insomnia", "Chronic pain", "Stress"],
  terpenes: [
    { name: "Myrcene", profile: "herbal" },
    { name: "Caryophyllene", profile: "spice" },
  ],
  leaflyRating: 4.6,
  leaflyReviewCount: 10410,
};

describe("StrainPoster", () => {
  test("shows ailment chips and the Leafly footer by default", () => {
    render(
      <MemoryRouter>
        <StrainPoster profile={baseProfile} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Insomnia")).toBeTruthy();
    expect(screen.getByText("Chronic pain")).toBeTruthy();
    expect(screen.getByText("Stress")).toBeTruthy();
    // The footer renders the Leafly line "4.6★ · 10,410 reviews".
    expect(screen.getByText(/4\.6★/)).toBeTruthy();
    expect(screen.getByText(/10,410 reviews/)).toBeTruthy();
    // Terpenes appear in the footer.
    expect(screen.getByText(/Myrcene/)).toBeTruthy();
  });

  test("showAilmentChips={false} drops the medical-use chips", () => {
    render(
      <MemoryRouter>
        <StrainPoster profile={baseProfile} showAilmentChips={false} />
      </MemoryRouter>,
    );
    expect(screen.queryByText("Insomnia")).toBeNull();
    expect(screen.queryByText("Chronic pain")).toBeNull();
    expect(screen.queryByText("Stress")).toBeNull();
  });

  test("showAilmentChips={false} drops the Leafly footer (terpenes + review)", () => {
    render(
      <MemoryRouter>
        <StrainPoster profile={baseProfile} showAilmentChips={false} />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/Myrcene/)).toBeNull();
    expect(screen.queryByText(/10,410 reviews/)).toBeNull();
  });

  test("showAilmentChips={false} surfaces a green star chip with the rating", () => {
    const { container } = render(
      <MemoryRouter>
        <StrainPoster profile={baseProfile} showAilmentChips={false} />
      </MemoryRouter>,
    );
    // The star chip renders the average rating next to the THC line.
    expect(container.textContent).toMatch(/THC 17-23%/);
    expect(container.textContent).toMatch(/4\.6/);
    // The chip has the green/primary class.
    const chip = container.querySelector(".text-primary");
    expect(chip).toBeTruthy();
  });

  test("showAilmentChips={false} without a leaflyRating still drops the chip", () => {
    const noRating: StrainProfile = {
      ...baseProfile,
      leaflyRating: undefined,
      leaflyReviewCount: undefined,
    };
    const { container } = render(
      <MemoryRouter>
        <StrainPoster profile={noRating} showAilmentChips={false} />
      </MemoryRouter>,
    );
    // The THC line still shows.
    expect(container.textContent).toMatch(/THC 17-23%/);
    // But no green star chip is rendered when there is no rating.
    const chip = container.querySelector(".text-primary");
    expect(chip).toBeNull();
  });
});

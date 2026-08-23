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

function renderPoster(profile: StrainProfile = baseProfile) {
  return render(
    <MemoryRouter>
      <StrainPoster profile={profile} />
    </MemoryRouter>,
  );
}

describe("StrainPoster", () => {
  test("renders the iOS-style order: photo, type badge, name, THC line", () => {
    const { container } = renderPoster();
    const link = container.querySelector("a")!;
    // [0] photo container, [1] type badge, [2] name, [3] THC + rating row.
    expect(link.children).toHaveLength(4);
    expect(link.children[1]!.textContent).toBe("Indica");
    expect(link.children[2]!.textContent).toBe("Granddaddy Purple");
    expect(link.children[3]!.textContent).toContain("THC 17-23%");
  });

  test("shows the Leafly star chip next to the THC range", () => {
    const { container } = renderPoster();
    expect(container.textContent).toMatch(/THC 17-23%/);
    expect(container.textContent).toMatch(/4\.6/);
    const chip = container.querySelector(".text-primary");
    expect(chip).toBeTruthy();
  });

  test("drops the review text, terpene footer, and medical-use chips", () => {
    renderPoster();
    expect(screen.queryByText(/10,410 reviews/)).toBeNull();
    expect(screen.queryByText(/Leafly ·/)).toBeNull();
    expect(screen.queryByText(/Myrcene/)).toBeNull();
    expect(screen.queryByText("Insomnia")).toBeNull();
  });

  test("is not wrapped in a card — bare column, no chrome", () => {
    const { container } = renderPoster();
    const link = container.querySelector("a")!;
    expect(link.className).not.toContain("bg-card");
    expect(link.className).not.toContain("border");
    expect(link.className).not.toContain("rounded-2xl");
  });

  test("without a leaflyRating the THC line still shows but no chip", () => {
    const noRating: StrainProfile = {
      ...baseProfile,
      leaflyRating: undefined,
      leaflyReviewCount: undefined,
    };
    const { container } = renderPoster(noRating);
    expect(container.textContent).toMatch(/THC 17-23%/);
    const chip = container.querySelector(".text-primary");
    expect(chip).toBeNull();
  });
});

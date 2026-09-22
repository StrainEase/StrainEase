import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { InteractionFlag } from "@/components/browse/InteractionFlag";
import type { InteractionFlag as InteractionFlagData } from "@/lib/strain-api";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const baseFlag: InteractionFlagData = {
  drugClass: "SSRI",
  severity: "low",
  summary:
    "Start with a low-THC or CBD-dominant product and watch for amplified anxiety or racing heart.",
};

describe("InteractionFlag", () => {
  test("renders the drug class and summary", () => {
    render(<InteractionFlag flag={baseFlag} />);
    expect(screen.getByText(/Possible interaction with your SSRI/)).toBeTruthy();
    expect(
      screen.getByText(/Start with a low-THC or CBD-dominant product/),
    ).toBeTruthy();
  });

  test("applies the severity-specific border color", () => {
    const { rerender } = render(<InteractionFlag flag={baseFlag} />);
    expect(screen.getByTestId("interaction-flag").className).toContain(
      "border-amber-500/50",
    );

    rerender(<InteractionFlag flag={{ ...baseFlag, severity: "moderate" }} />);
    expect(screen.getByTestId("interaction-flag").className).toContain(
      "border-orange-500/50",
    );
    expect(screen.getByText(/Moderate interaction with your SSRI/)).toBeTruthy();

    rerender(<InteractionFlag flag={{ ...baseFlag, severity: "high" }} />);
    expect(screen.getByTestId("interaction-flag").className).toContain(
      "border-red-500/50",
    );
    expect(screen.getByText(/High interaction with your SSRI/)).toBeTruthy();
  });

  test("exposes severity as a data attribute for testing and styling hooks", () => {
    render(<InteractionFlag flag={{ ...baseFlag, severity: "moderate" }} />);
    const el = screen.getByTestId("interaction-flag");
    expect(el.getAttribute("data-severity")).toBe("moderate");
  });

  test("falls back to amber tones for a theoretical flag the backend dropped", () => {
    render(<InteractionFlag flag={{ ...baseFlag, severity: "theoretical" }} />);
    const el = screen.getByTestId("interaction-flag");
    expect(el.className).toContain("border-amber-500/50");
    expect(screen.getByText(/Theoretical interaction with your SSRI/)).toBeTruthy();
  });

  test("has an aria-label so screen readers announce the badge", () => {
    render(<InteractionFlag flag={baseFlag} />);
    expect(
      screen.getByLabelText(/Drug interaction: SSRI, Possible/),
    ).toBeTruthy();
  });
});
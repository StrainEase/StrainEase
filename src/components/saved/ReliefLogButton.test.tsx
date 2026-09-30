import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, mock, test } from "bun:test";

mock.module("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const { ReliefLogButton } = await import("@/components/saved/ReliefLogButton");

afterEach(() => {
  cleanup();
});

describe("ReliefLogButton", () => {
  test('variant="button" renders the form expanded by default (strain view)', () => {
    render(<ReliefLogButton strainName="Blue Dream" variant="button" />);
    // No toggle trigger — the form is always visible to match the
    // dedicated "log this session" surface on the strain detail page.
    expect(
      screen.queryByRole("button", { name: /how did this go/i }),
    ).toBeNull();
    // The fit chips and Save button are present.
    expect(screen.getByRole("button", { name: /just right/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /save log/i })).toBeTruthy();
  });

  test("the default link variant keeps its inline toggle (saved panel)", () => {
    render(<ReliefLogButton strainName="Blue Dream" />);
    const trigger = screen.getByRole("button", { name: /how did this go/i });
    expect(trigger.className).not.toContain("w-full");
  });

  test('variant="button" exposes the "Add session details" disclosure', () => {
    render(<ReliefLogButton strainName="Blue Dream" variant="button" />);
    expect(
      screen.getByRole("button", { name: /add session details/i }),
    ).toBeTruthy();
  });

  test("opening the session details shows form/dose/time-of-day/side-effect fields", () => {
    render(<ReliefLogButton strainName="Blue Dream" variant="button" />);
    fireEvent.click(
      screen.getByRole("button", { name: /add session details/i }),
    );
    expect(screen.getByRole("button", { name: /^flower$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^edible$/i })).toBeTruthy();
    expect(screen.getByPlaceholderText(/e\.g\. 5/)).toBeTruthy();
    expect(screen.getByPlaceholderText(/e\.g\. 15/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /^morning$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^night$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /anxiety/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /dry mouth/i })).toBeTruthy();
  });
});

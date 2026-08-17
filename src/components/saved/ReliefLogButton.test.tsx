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
  test('variant="button" renders a full-width trigger (strain view)', () => {
    render(<ReliefLogButton strainName="Blue Dream" variant="button" />);
    const button = screen.getByRole("button", { name: /how did this go/i });
    expect(button.className).toContain("w-full");
  });

  test("the default link variant stays inline (saved panel, compare card)", () => {
    render(<ReliefLogButton strainName="Blue Dream" />);
    const button = screen.getByRole("button", { name: /how did this go/i });
    expect(button.className).not.toContain("w-full");
  });

  test('variant="button" keeps full width while the form is open', () => {
    render(<ReliefLogButton strainName="Blue Dream" variant="button" />);
    const trigger = screen.getByRole("button", { name: /how did this go/i });
    fireEvent.click(trigger);
    const cancel = screen.getByRole("button", { name: /^cancel$/i });
    expect(cancel.className).toContain("w-full");
  });
});

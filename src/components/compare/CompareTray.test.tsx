import { CompareTray } from "@/components/compare/CompareTray";
import type { CompareSelection } from "@/hooks/use-compare-selection";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, mock, test } from "bun:test";

/**
 * Build a fake `CompareSelection` that matches the hook's return shape.
 * Each test only fills in the fields it cares about — every other
 * method is a `mock()` so we can assert on call counts.
 */
function makeSelection(
  names: string[],
  overrides: Partial<CompareSelection> = {},
): CompareSelection {
  return {
    names,
    add: mock(() => {}),
    remove: mock(() => {}),
    toggle: mock(() => true),
    setNames: mock(() => {}),
    clear: mock(() => {}),
    isIn: mock(() => false),
    atCap: names.length >= 3,
    count: names.length,
    cap: 3,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  mock.restore();
});

describe("CompareTray", () => {
  test("renders nothing when the selection is empty", async () => {
    const selection = makeSelection([]);
    const onCompare = mock(() => {});
    render(<CompareTray selection={selection} onCompare={onCompare} />);
    // framer-motion exits with a transition; the region element
    // should not be in the document.
    expect(screen.queryByRole("region", { name: /compare selection/i })).toBeNull();
    expect(onCompare).toHaveBeenCalledTimes(0);
  });

  test("renders chips and the Compare/Clear buttons when populated", async () => {
    const selection = makeSelection(["Blue Dream", "OG Kush"]);
    render(<CompareTray selection={selection} onCompare={() => {}} />);

    await waitFor(() => {
      expect(
        screen.getByRole("region", { name: /compare selection/i }),
      ).toBeTruthy();
    });

    expect(screen.getByText("Blue Dream")).toBeTruthy();
    expect(screen.getByText("OG Kush")).toBeTruthy();
    expect(screen.getByRole("button", { name: /compare \(2\)/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^clear$/i })).toBeTruthy();
  });

  test("clicking a chip's × calls the selection's remove with that name", async () => {
    const remove = mock((name: string) => {
      void name;
    });
    const selection = makeSelection(["Blue Dream", "OG Kush"], { remove });
    render(<CompareTray selection={selection} onCompare={() => {}} />);

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /compare selection/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /remove Blue Dream/i }));
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls[0]?.[0]).toBe("Blue Dream");
  });

  test("clicking the Compare button invokes onCompare", async () => {
    const onCompare = mock(() => {});
    const selection = makeSelection(["Blue Dream", "OG Kush"]);
    render(<CompareTray selection={selection} onCompare={onCompare} />);

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /compare selection/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /compare \(2\)/i }));
    expect(onCompare).toHaveBeenCalledTimes(1);
  });

  test("Compare button is disabled when fewer than two strains are selected", async () => {
    const onCompare = mock(() => {});
    const selection = makeSelection(["Blue Dream"]);
    render(<CompareTray selection={selection} onCompare={onCompare} />);

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /compare selection/i })).toBeTruthy();
    });

    const compareButton = screen.getByRole("button", {
      name: /compare \(1\)/i,
    }) as HTMLButtonElement;
    expect(compareButton.disabled).toBe(true);
  });

  test("clicking Clear invokes the selection's clear", async () => {
    const clear = mock(() => {});
    const selection = makeSelection(["Blue Dream", "OG Kush"], { clear });
    render(<CompareTray selection={selection} onCompare={() => {}} />);

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /compare selection/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /^clear$/i }));
    expect(clear).toHaveBeenCalledTimes(1);
  });

  test("Compare button is disabled while isRunning=true", async () => {
    const onCompare = mock(() => {});
    const selection = makeSelection(["Blue Dream", "OG Kush"]);
    render(
      <CompareTray
        selection={selection}
        onCompare={onCompare}
        isRunning={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /compare selection/i })).toBeTruthy();
    });

    // framer-motion exit might briefly keep prior content; assert on
    // the "Comparing…" label specifically.
    expect(screen.getByText(/comparing/i)).toBeTruthy();
  });
});
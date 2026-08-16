import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, mock, test } from "bun:test";

afterEach(() => {
  cleanup();
  mock.restore();
});

describe("CompareToggleButton", () => {
  test("renders the idle state with 'Add to compare' and aria-pressed=false", () => {
    render(
      <CompareToggleButton
        isInSelection={false}
        isFull={false}
        onToggle={() => {}}
      />,
    );
    const button = screen.getByRole("button", { name: /add to compare/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  test("renders the selected state with 'In compare' and aria-pressed=true", () => {
    render(
      <CompareToggleButton
        isInSelection={true}
        isFull={false}
        onToggle={() => {}}
      />,
    );
    const button = screen.getByRole("button", { name: /remove from compare/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  test("renders the full state with 'Compare is full' and disabled when not selected", () => {
    render(
      <CompareToggleButton
        isInSelection={false}
        isFull={true}
        onToggle={() => {}}
      />,
    );
    const button = screen.getByRole("button", {
      name: /compare is full \(3 strains\)/i,
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.getAttribute("title")).toBe("Compare is full (3 strains)");
  });

  test("click in idle state fires onToggle exactly once", () => {
    let calls = 0;
    render(
      <CompareToggleButton
        isInSelection={false}
        isFull={false}
        onToggle={() => {
          calls += 1;
        }}
      />,
    );
    const button = screen.getByRole("button", { name: /add to compare/i });
    fireEvent.click(button);
    expect(calls).toBe(1);
  });

  test("click in selected state fires onToggle exactly once", () => {
    let calls = 0;
    render(
      <CompareToggleButton
        isInSelection={true}
        isFull={false}
        onToggle={() => {
          calls += 1;
        }}
      />,
    );
    const button = screen.getByRole("button", { name: /remove from compare/i });
    fireEvent.click(button);
    expect(calls).toBe(1);
  });

  test("click in full state is a no-op (disabled button does not fire handler)", () => {
    let calls = 0;
    render(
      <CompareToggleButton
        isInSelection={false}
        isFull={true}
        onToggle={() => {
          calls += 1;
        }}
      />,
    );
    const button = screen.getByRole("button", {
      name: /compare is full \(3 strains\)/i,
    }) as HTMLButtonElement;
    // happy-dom doesn't honor `disabled` for synthetic clicks, so we
    // verify the prop directly. The browser still won't dispatch a
    // click for a disabled button.
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(calls).toBe(0);
  });

  test("click does not bubble (stopPropagation is called)", () => {
    const onToggle = mock(() => {});
    const onParentClick = mock(() => {});
    render(
      <div onClick={onParentClick}>
        <CompareToggleButton
          isInSelection={false}
          isFull={false}
          onToggle={onToggle}
        />
      </div>,
    );
    const button = screen.getByRole("button", { name: /add to compare/i });
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onParentClick).toHaveBeenCalledTimes(0);
  });
});
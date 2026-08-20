import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Outer hairline tray + inner surface. Borders only — no drop shadows.
 * Mirrors iOS `SWCard` in `Theme/Components.swift`.
 *
 * Structure:
 * - Outer tray: muted fill at ~45% opacity, 26px radius, border at 70%
 * - 5px gap
 * - Inner surface: card fill, 22px radius, full border (or primary when emphasized)
 */
function SWCard({
  className,
  innerClassName,
  emphasized = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  emphasized?: boolean;
  /** Extra classes on the inner surface (padding overrides, etc.). */
  innerClassName?: string;
}) {
  return (
    <div
      data-slot="sw-card"
      className={cn(
        "rounded-[26px] border border-border/70 bg-muted/45 p-[5px]",
        className,
      )}
      {...props}
    >
      <div
        data-slot="sw-card-inner"
        className={cn(
          "rounded-[22px] border bg-card text-card-foreground",
          emphasized ? "border-primary/45" : "border-border",
          // Default padding matches iOS's 18pt; callers can override via innerClassName.
          "p-[18px]",
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export { SWCard };

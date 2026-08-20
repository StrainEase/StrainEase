import { cn } from "@/lib/utils";

/**
 * The two-orb mesh background used across the iOS app (see
 * ios/StrainWise/Theme/MeshBackground.swift). Renders a fixed, full-viewport
 * layer that sits behind the page content. The radial colors are kept in sync
 * with `Palette.glowMint` / `Palette.glowDeep` in
 * ios/StrainWise/Theme/Palette.swift so web and iOS read as the same surface.
 *
 * Implementation notes:
 *
 * - The two radials use viewport-relative sizes (`%` units) and position the
 *   center at the top-right and bottom-left corners. The `transparent`
 *   stops sit comfortably inside the visible area so the gradient always
 *   ends in the body color, with no hard edge.
 * - The previous fixed-pixel implementation (840x840 box positioned at the
 *   top-right) left a visible horizontal seam on viewports taller than
 *   ~760px because the gradient box ended mid-screen. Sizing the radials to
 *   the viewport eliminates that seam.
 * - `pointer-events-none` keeps the layer purely decorative; `-z-10` puts
 *   it behind the page content. The caller should still set
 *   `relative isolate` on its container so the mesh doesn't fight the page's
 *   own stacking context.
 */
export function MeshBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 mesh-bg",
        className,
      )}
    />
  );
}

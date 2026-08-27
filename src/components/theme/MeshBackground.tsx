import { cn } from "@/lib/utils";

/**
 * The two-orb mesh background used across the iOS app (see
 * ios/StrainEase/Theme/MeshBackground.swift). Renders a fixed, full-viewport
 * layer that sits behind the page content. The radial colors are kept in sync
 * with `Palette.glowMint` / `Palette.glowDeep` in
 * ios/StrainEase/Theme/Palette.swift so web and iOS read as the same surface.
 *
 * Mount it as the first child of a stacking-context container (e.g. a `<main>`
 * with `relative isolate`) so the page's `bg-card` surfaces sit on top of
 * the mesh while the gaps between cards show the gradient.
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

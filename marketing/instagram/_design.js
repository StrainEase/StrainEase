// StrainEase design tokens — extracted from the live repo:
// - theme color #174A2F (index.html <meta theme-color>)
// - logo gradient #22C55E -> #0C5238 (public/logo.svg)
// - font stack: Figtree (display + body — 400 regular + 700 bold),
//   IBM Plex Mono (meta — 400 regular), Lora (italic accent)
// - tone: warm, evidence-forward, "patient voices not prescriptions", 21+
//
// This file is the single source of truth. Change a token here,
// re-run render.js, every asset follows.

const colors = {
  // brand
  greenBright: '#22C55E', // leaf-top highlight
  greenMid:    '#16A34A', // CTA / hover
  green:       '#0C5238', // leaf deep / logo end-stop
  deepGreen:   '#082F22', // 80% canvas variant
  forest:      '#174A2F', // theme color / iOS dark surface

  // canvas
  bg:          '#08271C', // dark, gives the gradient room to glow
  surface:     '#0E3825', // cards
  surface2:    '#134431', // pressed / chips
  line:        '#1F5A3D', // soft divider in dark green family

  // text
  text:        '#F4F4F2', // warm off-white, not pure white (less clinical)
  muted:       '#A3B5A8', // desaturated sage
  dim:         '#6F8579', // quiet text, captions
  amber:       '#F5C56A', // sparing warm accent (complement to green)
};

const fonts = {
  display: '"Figtree", "Inter", system-ui, sans-serif',
  body:    '"Figtree", "Inter", system-ui, sans-serif',
  italic:  '"Lora", "Source Serif Pro", Georgia, serif',
  mono:    '"IBM Plex Mono", ui-monospace, Menlo, monospace',
};

module.exports = { colors, fonts };

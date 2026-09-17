# StrainEase — Marketing Materials Spec

The single source of truth for any future marketing material — IG posts,
stories, blog hero images, OG cards, pitch decks, ads. When something is
shipped to the public, it should match this spec.

---

## 1. Brand

**StrainEase** — a medical-cannabis research and comparison tool for
patients. Aggregates Leafly reviews, Weedmaps listings, Reddit threads
in r/medicalmarijuana, Google discussion, and live dispensary menus.
Ranks strains by what other patients report for each symptom.

**One-liner:** *"The strain matcher that listens to patients."*

**Voice:** warm, evidence-forward, never clinical. Soft verbs, no
marketing puffery. Always cite who said what.

**Audience:** adult medical-cannabis patients (21+) in legal US states
and Canada. The site itself says *"This is an information and comparison
tool. Nothing here is a diagnosis, prescription, or treatment
recommendation."* — never lose that posture.

**Compliance posture:** always 21+. Never claim efficacy. Always say
*"patients report"* or *"patients keep coming back to"* — never
*"treats"*, *"cures"*, *"relieves"*. Cite the source community behind
every claim.

---

## 2. Logo

**Asset:** `marketing/strainease-logo.svg` — the rod-of-Asclepius + cannabis
leaf mark on a green gradient (`#22C55E → #0C5238`), 200px-rounded square.

**Wordmark:** the SVG already includes the "StrainEase" wordmark. When
pairing the icon with the brand name as separate text (our standard
template), use **Figtree 600** in the off-white `#F4F4F2`, letter-spacing
`-0.02em`. Logo size in templates: 56×56 icon + 30px text beside it.

**Do:**
- Use the SVG at any size — it's vector
- Pair with the off-white wordmark on dark backgrounds
- Add breathing room around it (≥ 32px clear space)

**Don't:**
- Recolor the leaf/serpent — the green gradient is the mark
- Drop shadow under it on dark backgrounds (the SVG already has one)
- Place on a busy background — solid dark green only
- Stretch it non-uniformly

---

## 3. Colors

### Brand greens (canvas + accents)

| Token            | Hex       | Use                                  |
|------------------|-----------|--------------------------------------|
| `bg`             | `#08271C` | Page canvas — deepest, holds the gradients |
| `surface`        | `#0E3825` | Cards, pills                         |
| `surface2`       | `#134431` | Chip background (sources, tags)      |
| `line`           | `#1F5A3D` | Hairline borders                     |
| `forest`         | `#174A2F` | Theme color (matches index.html)     |
| `green`          | `#0C5238` | Logo gradient end-stop               |
| `greenBright`    | `#22C55E` | Logo gradient start, hero numbers, accent text |
| `greenMid`       | `#16A34A` | Gradient fill                        |

### Text

| Token     | Hex       | Use                          |
|-----------|-----------|------------------------------|
| `text`    | `#F4F4F2` | Body titles                  |
| `muted`   | `#A3B5A8` | Body text, meta, handles     |
| `dim`     | `#6F8579` | Reserved (matches muted now) |

### Accent (sparingly — only for compliance / 21+)

| Token   | Hex       | Use                  |
|---------|-----------|----------------------|
| `amber` | `#F5C56A` | Reserved. Use for 21+ if needed; never for decoration |

**Rule:** greens carry the brand. If you reach for any non-green color
on a marketing asset, stop and check the brief. The amber exists for
emergencies (real compliance messaging), not for visual variety.

---

## 4. Typography

Fonts are **self-hosted as woff2** under `./instagram/fonts/`. Don't link
out to Google Fonts in production renders — Playwright won't always
resolve them, and a missing font silently degrades to system-ui.

| Role      | Family        | Weight | Notes                           |
|-----------|---------------|--------|---------------------------------|
| Display   | Figtree       | 600    | Titles, headlines               |
| Display bold | Figtree   | 700    | Hero numbers only (01/02/03, symptom counts) |
| Body      | Figtree       | 400    | Descriptions, body copy at 36px  |
| Italic accent | Lora      | 400 italic | Quote highlights, accent words |
| Mono      | IBM Plex Mono | 400    | Meta, pills, slide counter, captions |

**Weight map matches the actual StrainEase site:**
- `font-semibold` (600) is the title workhorse — 202× in source
- `font-medium` (500) is sub-headers — 119× in source
- `font-normal` (400) is body — 12× in source
- `font-bold` (700) is rare — only hero numbers, age-gate circles

### Type scale (1080×810 canvas)

| Class        | Size  | Use                              |
|--------------|-------|----------------------------------|
| `t-large`    | 78px  | Hero titles on squares           |
| `t-medium`   | 64px  | Default titles on 4:3            |
| `t-quote`     | 48px  | Block quote / pull-quote         |
| `sub`        | 36px  | Body descriptions (carousel body) |
| `step-sub`   | 18px  | Step card sub (after 4:3 tighten)|
| `.small`     | 14px  | Carousel counter (01 OF 04)      |
| `.handle`    | 22px  | @username                        |

### Never use

- Italic display Figtree (no font-style set, body classes use straight)
- Lora for non-italic body copy (it's a serif italic — only the italic style exists)
- Font weights other than 400/500/600/700
- Em dashes `—` anywhere in visible copy. Replace with periods, commas, or colons depending on context. (Em dashes are kept in code comments / section markers only — they don't render.)

---

## 5. Canvas sizes

**The 4:3 ratio is the standard for all post slides (1080×810).**
Stories remain 1080×1920 (9:16). All sizes are width × height.

| Format              | Size          | Use                                  |
|---------------------|---------------|--------------------------------------|
| Square 1:1          | 1080×1080     | Reserved (not used in current kit)   |
| Portrait 4:5        | 1080×1350     | Reserved (Instagram feed max)        |
| Landscape 4:3       | **1080×810**  | **Default for all post slides**      |
| Story 9:16          | 1080×1920     | Instagram / FB Stories only          |
| Reel cover 9:16     | 1080×1920     | Reel thumbnails                      |
| OG card 1.91:1      | 1200×630      | Site OG images, link previews        |

**Why 4:3:** Instagram's standard carousel requires all slides to share
the same aspect ratio. 4:3 was picked over 1:1 for editorial balance
(less crammed than square, less vertical-only than 4:5 portrait). It's
still slightly wider than tall, which reads as "post" not "story" at
thumb size.

When posting a multi-image set to IG, **all slides in the carousel must
share the same aspect ratio.** Don't mix 4:3 with 1:1 or 4:5.

---

## 6. Layout grid

A 1080×810 canvas follows this internal grid:

```
┌─────────────────────────────────────────┐ ← 64px top padding
│  [LOGO]                           [PILL] │ ← 56px tall brand row
│                                         │
│                                         │
│            ─── BODY ───                 │ ← flex: 1
│         (centered, justify-center)       │
│                                         │
│                                         │
│                                         │
│  [HANDLE]                       [21+]   │ ← 60px footer
└─────────────────────────────────────────┘ ← 64px bottom padding
```

- **Padding:** 64px top/bottom, 72px left/right (1080×810)
- **Top row:** brand mark (left) + page indicator pill (right)
- **Body:** fills middle, centers content vertically
- **Bottom row:** `@handle` (left) + `21+` pill (right)

**Page indicator:** always present, top-right corner. Format: `01`–`07`
on feed posts, `01 OF 04`–`04 OF 04` on carousel slides. Same sage
`.pill` style throughout — no green accents, no amber, no color
variation across slides.

### Backgrounds

Every post has the same dual-radial gradient base:

```
.stage::before {
  background:
    radial-gradient(ellipse 80% 110% at 90% 0%,   greenMid 20% → transparent 70%),
    radial-gradient(ellipse 70% 110% at 0% 100%,  greenBright 13% → transparent 65%);
}
```

This gives a subtle warm-green glow in the upper-right and lower-left.
**Don't** swap to other gradients. The corners are the only spots where
the canvas shows color variation; the rest is `#08271C` solid.

---

## 7. Components

### Brand chip (top-left)
- 56×56 logo SVG
- 30px "StrainEase" wordmark in Figtree 600

### Page indicator (top-right)
- `.pill` — sage outline, 18px IBM Plex Mono, 9px padding
- Live state (`.pill.live`) — green tint, only on slide 03 (live now)
- Never gold/amber/other colors

### 21+ pill (bottom-right)
- `.pill` with `age` modifier — sage (not amber)
- Always present on every marketing asset
- 18px IBM Plex Mono

### Hero numbers (portrait slide 05)
- `.num-step` — Figtree 700 bold
- Size: 48px on 4:3 canvases (was 72px on 1:1; reduced for fit)
- Color: `greenBright` (`#22C55E`)
- Use only for "01 / 02 / 03" style step numbers and symptom counts (12, 09, 14…)

### Source pill (carousel slide 02)
- `.src-pill` — 22px IBM Plex Mono, surface2 background
- Use for: Leafly, Weedmaps, Reddit, Google, Dispensary menus
- Wrap on a row, 12px gap

### Body card (slide 04, story 06)
- `.card` — surface bg, line border, 14–28px padding depending on density
- Never use `.card` as a callout for *warnings* (use pills for that)

### Compliance pills (story 07)
- `.tag` — 17px IBM Plex Mono, surface2 bg
- Examples: "Patient voices, not prescriptions" / "21+ only" / "Cite every claim"
- Three in a row max

---

## 8. Copy voice

### Do

- "Patients report…" / "Patients keep coming back to…" / "What other patients say…"
- "A research and comparison tool built from what patients publicly say."
- "Free. No card. No 'results not typical.'"
- "Every pick cites its voices."
- Cite the source community behind every claim (r/medicalmarijuana, Leafly, etc.)

### Don't

- **Never** say "treats", "cures", "relieves", "heals", "effective for" — these are medical claims and would put the IG account at risk
- **Never** use em dashes `—` in visible copy. Replace with commas, periods, or colons
- **Never** say "always free" if there's any AI cost — say "Free" or "Free during beta" only
- **Never** use "patients say this *always* works" — hedge with "many patients", "patients report", "patient experience"
- **Never** start a sentence with "just", "simply", "easily"

### Compliance copy that always appears

Every feed asset has either:
- a `21+` pill in the footer, OR
- the compliance story `07_story_safety.png` posted alongside it

For Stories: always include both.

---

## 9. File conventions

### Naming
- Lowercase kebab-case
- Format: `NN_descriptor_variant.png`
  - `01_square_intro.png`
  - `03_square_match.png`
  - `08_carousel_03.png`
- Sequential numbering per post set, zero-padded to 2 digits

### Directories
```
marketing/
├── SPEC.md                      ← this file
├── strainease-logo.svg           ← canonical logo
├── strainease-og-image.jpg       ← site OG card
└── instagram/
    ├── _design.js               ← color + font tokens
    ├── _templates.js             ← HTML templates
    ├── _fontcss.generated.css    ← Google Fonts CSS, local URLs
    ├── _fontcss.js               ← regenerator script
    ├── render.js                 ← Playwright render script
    ├── captions.md               ← copy + hashtags per post
    ├── README.md                 ← engineering doc for the kit
    ├── fonts/                    ← self-hosted woff2 (Figtree, IBM Plex Mono, Lora)
    └── rendered/                 ← final PNGs, what ships to IG
```

### Regenerating

```bash
cd marketing/instagram
NODE_PATH=/usr/local/lib/node_modules node render.js
```

Requires Playwright globally installed + chromium binary at
`/root/.cache/ms-playwright/chromium-1243/`.

### Adding a new post

1. Add a template function in `_templates.js` (copy the closest existing one)
2. Add the job to `render.js`
3. Add caption to `captions.md`
4. Update SPEC.md if introducing a new component or pattern

---

## 10. Asset checklist before posting

For every asset going to IG:

- [ ] Rendered at 1080×810 (4:3), or 1080×1920 (story)
- [ ] Brand chip + page indicator visible
- [ ] Footer handle + 21+ visible
- [ ] Title uses Figtree 600 (semibold)
- [ ] Body uses Figtree 400 at 36px (or step-sub at 18px on portrait)
- [ ] No em dashes in visible copy
- [ ] No medical efficacy claims
- [ ] Source pills cite actual sources (Leafly / Weedmaps / Reddit / Google / Dispensary menus)
- [ ] Background gradient present and centered on canvas
- [ ] File named `NN_descriptor.png` matching the table in `captions.md`

If any check fails, fix before posting.

---

## 11. Don'ts — the hard list

These have happened in this kit at least once. Don't repeat them:

- ❌ **Don't** claim "always free" — StrainEase is AI-powered, costs aren't zero
- ❌ **Don't** use em dashes `—` anywhere in user-visible copy
- ❌ **Don't** let page indicators go gold/amber — they must stay sage like the rest
- ❌ **Don't** mix aspect ratios within a carousel set — IG requires uniform
- ❌ **Don't** put inline `style="font-family: 'Figtree', 'Inter', …"` in templates — quote escaping breaks it. Use the existing CSS classes
- ❌ **Don't** hardcode font weights higher than 700 — DM Sans / Figtree don't have weights above 700 in our preload
- ❌ **Don't** link to Google Fonts CSS in rendered HTML — the Playwright sandbox can't always reach them. Use the self-hosted `_fontcss.generated.css`
- ❌ **Don't** ship without running `node render.js` and visually auditing every output PNG
- ❌ **Don't** use Lora for non-italic text — it's only the italic style
- ❌ **Don't** put a body text font-size above 36px or below 14px — both fail at 4:3

---

## 12. Versioning

- **v0.1** — initial kit, square + portrait + stories + carousel, 1080×1080 / 1080×1920
- **v0.2** — switched all post slides to **4:3 (1080×810)** as standard, all sizes now uniform
- **v0.3** — fonts self-hosted as woff2 in `./fonts/`, removed Google CDN dependency
- **v0.4** — sans set to Figtree (regular + bold + Lora italic + IBM Plex Mono), matching actual StrainEase site weights
- **v0.5** — em dashes removed from all visible copy, "always free" slide removed (carousel 5)
- **v0.6** — body text unified at 36px (matches carousel square body), page indicators uniform sage

When updating, append a row here and note what changed.

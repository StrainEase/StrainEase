"""
StrainEase Instagram carousel generator.

Renders a 3-slide portrait (1080x1350) Instagram carousel that introduces the
StrainEase app: a hero slide, a "how it works" walkthrough, and an
ailments-covered grid. Reads the rounded app icon from marketing/icons/.

Usage:
    python3 generate.py            # writes all 3 slides
    python3 generate.py --slide 1  # one slide at a time
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# --------------------------------------------------------------------------- #
# Brand palette (kept in sync with index.html theme-color #174A2F)
# --------------------------------------------------------------------------- #
BG_DEEP    = (6, 18, 12)
BG_MID     = (10, 38, 26)
GLOW_CORE  = (74, 222, 128)
GLOW_MID   = (34, 197, 94)
GLOW_OUTER = (20, 90, 50)
TEXT_WHITE = (245, 248, 245)
TEXT_SUB   = (200, 220, 200)
LINK_COL   = (180, 240, 200)
PILL_BG    = (20, 60, 38, 220)
PILL_LINE  = (74, 222, 128, 150)

W, H = 1080, 1350  # Instagram 4:5 portrait
LOGO_PATH = Path(__file__).resolve().parent.parent / "icons" / "light-rounded.png"

# --------------------------------------------------------------------------- #
# Font helpers
# --------------------------------------------------------------------------- #
FONT_DIRS = [
    str(Path(__file__).resolve().parent.parent / "fonts"),     # bundled brand fonts
    "/usr/share/fonts/truetype/liberation",
    "/usr/share/fonts/truetype/dejavu",
]


def load_font(name_candidates: list[str], size: int) -> ImageFont.FreeTypeFont:
    for d in FONT_DIRS:
        for name in name_candidates:
            p = os.path.join(d, name)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()


# Brand fonts (Figtree / Lora / IBM Plex Mono) with Liberation fallbacks so
# the generator still works on machines that don't have the bundled fonts.
FONT_BOLD       = load_font(["Figtree-Bold.ttf",     "LiberationSans-Bold.ttf",    "DejaVuSans-Bold.ttf"],     132)
FONT_REG        = load_font(["Figtree-Regular.ttf",  "LiberationSans-Regular.ttf", "DejaVuSans.ttf"],           30)
FONT_REG_BIG    = load_font(["Figtree-Regular.ttf",  "LiberationSans-Regular.ttf", "DejaVuSans.ttf"],           36)
FONT_H2         = load_font(["Figtree-Bold.ttf",     "LiberationSans-Bold.ttf",    "DejaVuSans-Bold.ttf"],      78)
FONT_H3         = load_font(["Figtree-Bold.ttf",     "LiberationSans-Bold.ttf",    "DejaVuSans-Bold.ttf"],      44)
FONT_SERIF      = load_font(["Lora-Italic.ttf",      "LiberationSerif-Italic.ttf", "DejaVuSerif-Italic.ttf"],   46)
FONT_SERIF_BIG  = load_font(["Lora-Italic.ttf",      "LiberationSerif-Italic.ttf", "DejaVuSerif-Italic.ttf"],   56)
FONT_MONO       = load_font(["IBMPlexMono-Regular.ttf", "LiberationMono-Regular.ttf", "DejaVuSansMono.ttf"],     28)
FONT_SWIPE      = load_font(["Figtree-Bold.ttf",     "LiberationSans-Bold.ttf",    "DejaVuSans-Bold.ttf"],      26)
FONT_STEP_NUM   = load_font(["Figtree-Bold.ttf",     "LiberationSans-Bold.ttf",    "DejaVuSans-Bold.ttf"],      44)
FONT_STEP_TTL   = load_font(["Figtree-Bold.ttf",     "LiberationSans-Bold.ttf",    "DejaVuSans-Bold.ttf"],      30)
FONT_STEP_BODY  = load_font(["Figtree-Bold.ttf",     "LiberationSans-Bold.ttf",    "DejaVuSans-Bold.ttf"],      26)
FONT_AILMENT    = load_font(["Figtree-Bold.ttf",     "LiberationSans-Bold.ttf",    "DejaVuSans-Bold.ttf"],      26)
FONT_TAG        = load_font(["Figtree-Bold.ttf",     "LiberationSans-Bold.ttf",    "DejaVuSans-Bold.ttf"],      20)


# --------------------------------------------------------------------------- #
# Text primitives (anchor='mm' centers cleanly on the glyph ink)
# --------------------------------------------------------------------------- #
def text_size(d: ImageDraw.ImageDraw, text: str,
              font: ImageFont.FreeTypeFont) -> tuple[int, int]:
    """Width and rendered height of the text."""
    l, t, r, b = d.textbbox((0, 0), text, font=font)
    return r - l, b - t


def text_at(d, cx, cy, text, font, fill):
    """Draw text perfectly centered at (cx, cy) using PIL's anchor='mm'."""
    d.text((cx, cy), text, font=font, fill=fill, anchor="mm")


def centered_spaced(d, cy, text, font, fill, letter_spacing=0):
    """Letter-spaced text centered at y=cy. Centers on the actual inkbox."""
    parts = list(text)
    widths = [d.textlength(p, font=font) for p in parts]
    gaps = [letter_spacing] * (len(parts) - 1)
    total_w = sum(widths) + sum(gaps)

    bboxes = [d.textbbox((0, 0), p, font=font) for p in parts]
    min_top = min(b[1] for b in bboxes)
    max_bot = max(b[3] for b in bboxes)
    total_h = max_bot - min_top
    y_pos = cy - total_h / 2 - min_top

    x = (W - total_w) // 2
    for ch, w in zip(parts, widths):
        d.text((x, y_pos), ch, font=font, fill=fill)
        x += w + letter_spacing


# --------------------------------------------------------------------------- #
# Reusable compositing primitives
# --------------------------------------------------------------------------- #
def make_background() -> Image.Image:
    img = Image.new("RGB", (W, H), BG_DEEP)
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = 1 - abs(y - H * 0.45) / (H * 0.7)
        t = max(0, min(1, t)) ** 1.4
        r = int(BG_DEEP[0] * (1 - t) + BG_MID[0] * t)
        g = int(BG_DEEP[1] * (1 - t) + BG_MID[1] * t)
        b = int(BG_DEEP[2] * (1 - t) + BG_MID[2] * t)
        d.line([(0, y), (W, y)], fill=(r, g, b))
    return img.convert("RGBA")


def radial_glow(cx: int, cy: int, rx: int = 720, ry: int | None = None,
                max_alpha: float = 0.65) -> Image.Image:
    ry = ry or rx
    g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(g)
    steps = 28
    for i in range(steps, 0, -1):
        t = i / steps
        r = int(rx * t)
        ry_t = int(ry * t)
        if t > 0.7:
            col = GLOW_OUTER
        elif t > 0.35:
            col = GLOW_MID
        else:
            col = GLOW_CORE
        alpha = int(255 * (1 - t) ** 1.6 * max_alpha)
        if alpha < 1:
            continue
        gd.ellipse([cx - r, cy - ry_t, cx + r, cy + ry_t], fill=col + (alpha,))
    return g.filter(ImageFilter.GaussianBlur(35))


def composite_logo(img: Image.Image, cx: int, cy: int,
                   size: int = 460, with_halo: bool = True) -> int:
    logo = Image.open(LOGO_PATH).convert("RGBA").resize((size, size), Image.LANCZOS)
    lx, ly = cx - size // 2, cy - size // 2

    if with_halo:
        halo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        hd = ImageDraw.Draw(halo)
        r = int(size * 0.85)
        hd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(120, 255, 170, 90))
        halo = halo.filter(ImageFilter.GaussianBlur(60))
        img.alpha_composite(halo)

    img.alpha_composite(logo, (lx, ly))
    return ly + size  # bottom of logo


def make_pill(d, cx, cy, text, font, fill, pad_x=32, pad_y=14,
              bg=PILL_BG, line=PILL_LINE, line_w=2, radius=30):
    """Draw a chip/pill centered at (cx, cy) with text anchored to its middle."""
    tw, _ = text_size(d, text, font)
    box_w = int(tw + pad_x * 2)
    box_h = int(d.textbbox((0, 0), text, font=font)[3]
                - d.textbbox((0, 0), text, font=font)[1]
                + pad_y * 2)
    x0 = cx - box_w // 2
    y0 = cy - box_h // 2
    d.rounded_rectangle([x0, y0, x0 + box_w, y0 + box_h],
                        radius=radius, fill=bg, outline=line, width=line_w)
    text_at(d, cx, cy, text, font, fill)
    return (x0, y0, x0 + box_w, y0 + box_h)


def url_pill(d, cx, cy):
    """Centered 'strainease.ai' chip."""
    return make_pill(d, cx, cy, "strainease.ai", FONT_MONO, LINK_COL,
                     pad_x=32, pad_y=16)


def swipe_cta(d):
    """Bottom-right 'Swipe →' chip."""
    text = "Swipe →"
    pad_x, pad_y = 24, 12
    tw, th = text_size(d, text, FONT_SWIPE)
    box_w = int(tw + pad_x * 2)
    box_h = int(th + pad_y * 2)
    margin = 56
    x0 = W - box_w - margin
    y0 = H - box_h - margin
    d.rounded_rectangle([x0, y0, x0 + box_w, y0 + box_h],
                        radius=26, fill=(20, 60, 38, 220),
                        outline=(74, 222, 128, 180), width=2)
    text_at(d, x0 + box_w // 2, y0 + box_h // 2, text, FONT_SWIPE, LINK_COL)


def page_marker(d, index, total=3):
    """Top-right 'N / total' chip."""
    label = f"{index} / {total}"
    pad_x, pad_y = 18, 11
    tw, th = text_size(d, label, FONT_TAG)
    box_w = int(tw + pad_x * 2)
    box_h = int(th + pad_y * 2)
    margin_right, margin_top = 40, 40
    x0 = W - box_w - margin_right
    y0 = margin_top
    d.rounded_rectangle([x0, y0, x0 + box_w, y0 + box_h],
                        radius=18, fill=(20, 60, 38, 180),
                        outline=(74, 222, 128, 120), width=1)
    text_at(d, x0 + box_w // 2, y0 + box_h // 2, label, FONT_TAG, LINK_COL)


# --------------------------------------------------------------------------- #
# Slide builders
# --------------------------------------------------------------------------- #
def build_slide_1(out_dir: Path) -> Path:
    """Hero — rounded logo with green glow, wordmark + tagline + swipe CTA."""
    img = make_background()
    cx, cy = W // 2, int(H * 0.40)
    img.alpha_composite(radial_glow(cx, cy, rx=720))

    d = ImageDraw.Draw(img)
    logo_bottom = composite_logo(img, cx, cy - 20, size=460)

    # Wordmark centered on its own band (top of band = logo_bottom + 70)
    word_cy = logo_bottom + 70 + 65
    centered_spaced(d, word_cy, "StrainEase", FONT_BOLD,
                    TEXT_WHITE, letter_spacing=2)

    # Italic tagline — clear gap below wordmark
    sub = "Find your relief today."
    sub_cy = word_cy + 90
    text_at(d, cx, sub_cy, sub, FONT_SERIF, TEXT_SUB)

    # URL pill centered horizontally, pinned to bottom
    PILL_CY = H - 130 - 30
    url_pill(d, cx, PILL_CY)

    swipe_cta(d)
    page_marker(d, 1)

    out = out_dir / "slide-1-hero.png"
    img.convert("RGB").save(out, "PNG", optimize=True)
    return out


def build_slide_2(out_dir: Path) -> Path:
    """How it works — three-step flow with balanced top/bottom margins."""
    img = make_background()
    img.alpha_composite(radial_glow(W // 2, int(H * 0.18),
                                    rx=520, ry=260, max_alpha=0.35))

    d = ImageDraw.Draw(img)
    page_marker(d, 2)

    # --- Title block ---
    TITLE_Y = 130
    title_gap = 40                                          # gap title → subtitle
    title = "How StrainEase works"
    sub_lines = ["Built with Dr. Kaya,",                   # split for narrower width
                 "our AI cannabis care assistant."]
    sub_line_height = 60                                   # line height for 46pt Lora
    _, title_h = text_size(d, title, FONT_H2)

    text_at(d, W // 2, TITLE_Y + title_h // 2, title, FONT_H2, TEXT_WHITE)
    sub_block_top = TITLE_Y + title_h + title_gap
    for i, line in enumerate(sub_lines):
        line_cy = sub_block_top + i * sub_line_height + sub_line_height // 2
        text_at(d, W // 2, line_cy, line, FONT_SERIF, TEXT_SUB)
    sub_block_bottom = sub_block_top + len(sub_lines) * sub_line_height

    # --- Card stack with balanced margins ---
    card_w = 880
    card_h = 200
    gap = 28
    stack_h = 3 * card_h + 2 * gap

    PILL_H = 60
    PILL_Y_TOP    = H - 130 - PILL_H
    PILL_Y_BOTTOM = PILL_Y_TOP + PILL_H

    TOP_MARGIN    = 60
    BOTTOM_MARGIN = 60
    min_cards_top    = sub_block_bottom + TOP_MARGIN
    max_cards_bottom = PILL_Y_TOP - BOTTOM_MARGIN
    band_h = max_cards_bottom - min_cards_top
    cards_top = min_cards_top + (band_h - stack_h) // 2

    steps = [
        ("1", "Tell us your symptoms",
         "Pick a common ailment or describe any symptom you have. "
         "We rank strains for any condition, not just the ones on our list."),
        ("2", "We research for you",
         "Pulls patient reports from Leafly, Weedmaps, Reddit, "
         "Google and dispensary menus."),
        ("3", "Get ranked strains",
         "Dr. Kaya ranks the closest matches with reasons, "
         "best-for notes and cautions."),
    ]

    # Inner card layout
    INNER_PAD_LEFT = 40
    BADGE_R = 36
    BADGE_CX_OFFSET = INNER_PAD_LEFT + BADGE_R          # 76 — badge center x
    TEXT_X_OFFSET = BADGE_CX_OFFSET + BADGE_R + 26      # 138 — text column left
    TITLE_TO_BODY = 18                                  # tight gap title→body
    BODY_LINE_HEIGHT = 34

    # Pre-measure text widths to know block height before placing
    def card_block_metrics(text_ttl, text_body):
        tbbox = d.textbbox((0, 0), text_ttl, font=FONT_STEP_TTL)
        title_h = tbbox[3] - tbbox[1]
        title_w = tbbox[2] - tbbox[0]
        max_w = card_w - TEXT_X_OFFSET - INNER_PAD_LEFT
        body_lines = measure_wrap(d, text_body, FONT_STEP_BODY, max_w)
        body_h = BODY_LINE_HEIGHT * max(1, len(body_lines))
        block_h = title_h + TITLE_TO_BODY + body_h
        return title_h, title_w, body_lines, body_h, block_h

    for i, (num, ttl, body) in enumerate(steps):
        x = (W - card_w) // 2
        y = int(cards_top + i * (card_h + gap))

        d.rounded_rectangle([x, y, x + card_w, y + card_h],
                            radius=22, fill=(14, 40, 26, 230),
                            outline=(74, 222, 128, 110), width=2)

        # Measure block so we can vertically center title+body in the card
        title_h, title_w, body_lines, body_h, block_h = card_block_metrics(ttl, body)
        block_top = y + (card_h - block_h) // 2

        # Title (centered on its own row at the top of the block)
        title_cy = block_top + title_h // 2
        text_at(d, x + TEXT_X_OFFSET + title_w // 2, title_cy,
                ttl, FONT_STEP_TTL, TEXT_WHITE)

        # Body wrapped, starts TITLE_TO_BODY below the title
        body_top = block_top + title_h + TITLE_TO_BODY
        wrap_body(d, body, FONT_STEP_BODY, x + TEXT_X_OFFSET, body_top,
                  card_w - TEXT_X_OFFSET - INNER_PAD_LEFT,
                  fill=TEXT_SUB, line_height=BODY_LINE_HEIGHT)

        # Badge centered on the full card height
        badge_cx = x + BADGE_CX_OFFSET
        badge_cy = y + card_h // 2

        d.ellipse([badge_cx - BADGE_R, badge_cy - BADGE_R,
                   badge_cx + BADGE_R, badge_cy + BADGE_R],
                  fill=GLOW_CORE + (255,))
        text_at(d, badge_cx, badge_cy, num, FONT_STEP_NUM, (6, 50, 25))

    # URL pill anchored to bottom
    make_pill(d, W // 2, (PILL_Y_TOP + PILL_Y_BOTTOM) // 2,
              "strainease.ai", FONT_MONO, LINK_COL, pad_x=32, pad_y=16)

    # Swipe CTA bottom-right
    swipe_cta(d)

    out = out_dir / "slide-2-how-it-works.png"
    img.convert("RGB").save(out, "PNG", optimize=True)
    return out


def wrap_body(d, text, font, x, y, max_w, fill, line_height=30,
              return_lines=False):
    """Word-wrap text starting at (x, y); returns lines (if requested)."""
    words = text.split()
    lines, line = [], ""
    for w in words:
        trial = (line + " " + w).strip()
        if d.textlength(trial, font=font) <= max_w or not line:
            line = trial
        else:
            lines.append(line)
            line = w
    if line:
        lines.append(line)
    for i, ln in enumerate(lines):
        d.text((x, y + i * line_height), ln, font=font, fill=fill)
    return lines if return_lines else None


def measure_wrap(d, text, font, max_w, line_height=30):
    """Return the wrapped lines without drawing — used to compute block heights."""
    words = text.split()
    lines, line = [], ""
    for w in words:
        trial = (line + " " + w).strip()
        if d.textlength(trial, font=font) <= max_w or not line:
            line = trial
        else:
            lines.append(line)
            line = w
    if line:
        lines.append(line)
    return lines


def build_slide_3(out_dir: Path) -> Path:
    """Ailments covered — chip grid, vertically centered, last row pill centered."""
    img = make_background()
    img.alpha_composite(radial_glow(W // 2, int(H * 0.50),
                                    rx=560, ry=560, max_alpha=0.28))

    d = ImageDraw.Draw(img)
    page_marker(d, 3)

    # --- Title block ---
    TITLE_Y_TOP = 130
    title_gap = 40                           # matches slide 2 title→subtitle
    title = "Symptoms we cover"
    sub   = "Real patient reports, not generic lists."
    _, title_h = text_size(d, title, FONT_H2)
    _, sub_h   = text_size(d, sub,   FONT_SERIF)

    text_at(d, W // 2, TITLE_Y_TOP + title_h // 2, title, FONT_H2, TEXT_WHITE)
    sub_cy = TITLE_Y_TOP + title_h + title_gap + sub_h // 2
    text_at(d, W // 2, sub_cy, sub, FONT_SERIF, TEXT_SUB)
    sub_block_bottom = sub_cy + sub_h // 2

    # --- Ailment chips ---
    ailments = [
        "Chronic pain", "Anxiety", "Insomnia", "Stress",
        "Depression", "PTSD", "Nausea", "Migraines",
        "Muscle spasms", "ADHD", "Fatigue", "Appetite loss",
        "Fibromyalgia", "Sciatica", "Inflammation", "Arthritis",
    ]

    cols = 3
    pill_w, pill_h = 280, 60
    gap_x, gap_y = 22, 22
    full_rows = len(ailments) // cols
    leftover  = len(ailments) - full_rows * cols
    total_rows = full_rows + (1 if leftover else 0)

    grid_w = cols * pill_w + (cols - 1) * gap_x
    grid_h = total_rows * pill_h + (total_rows - 1) * gap_y
    start_x_full = (W - grid_w) // 2

    # --- Vertical centering ---
    FOOTER_GAP   = 56
    PILL_H       = 60
    PILL_Y_TOP   = H - 130 - PILL_H
    FOOTER_BLOCK_H = 36

    grid_bottom_max = PILL_Y_TOP - FOOTER_GAP - FOOTER_BLOCK_H
    grid_top_min    = sub_block_bottom + 40
    band_h          = grid_bottom_max - grid_top_min
    start_y         = grid_top_min + (band_h - grid_h) // 2

    def draw_chip(name, cx_center, cy_center):
        x0 = cx_center - pill_w // 2
        y0 = cy_center - pill_h // 2
        d.rounded_rectangle([x0, y0, x0 + pill_w, y0 + pill_h],
                            radius=30, fill=(14, 40, 26, 235),
                            outline=(74, 222, 128, 130), width=2)
        text_at(d, cx_center, cy_center, name, FONT_AILMENT, TEXT_WHITE)

    # Full rows
    for r in range(full_rows):
        for c in range(cols):
            i = r * cols + c
            name = ailments[i]
            cx = start_x_full + c * (pill_w + gap_x) + pill_w // 2
            cy = start_y + r * (pill_h + gap_y) + pill_h // 2
            draw_chip(name, cx, cy)

    # Leftover row centered horizontally in the grid band
    if leftover:
        last_row_cy = start_y + full_rows * (pill_h + gap_y) + pill_h // 2
        row_w = leftover * pill_w + (leftover - 1) * gap_x
        x_start_centered = start_x_full + (grid_w - row_w) // 2 + pill_w // 2
        for k, name in enumerate(ailments[full_rows * cols:]):
            draw_chip(name, x_start_centered + k * (pill_w + gap_x), last_row_cy)

    # --- Footer + pill ---
    footer = "Plus anything you describe. We rank strains for any symptom."
    footer_y = PILL_Y_TOP - FOOTER_GAP - FOOTER_BLOCK_H + FOOTER_BLOCK_H // 2
    text_at(d, W // 2, footer_y, footer, FONT_REG, TEXT_SUB)

    # URL pill anchored to bottom
    make_pill(d, W // 2, (PILL_Y_TOP + PILL_Y_TOP + PILL_H) // 2,
              "strainease.ai", FONT_MONO, LINK_COL, pad_x=32, pad_y=16)

    out = out_dir / "slide-3-ailments.png"
    img.convert("RGB").save(out, "PNG", optimize=True)
    return out


# --------------------------------------------------------------------------- #
# Entrypoint
# --------------------------------------------------------------------------- #
def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--slide", type=int, default=None,
                        help="1 = hero, 2 = how it works, 3 = ailments")
    parser.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "output"),
                        help="output directory")
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    builders = {
        1: ("slide-1-hero.png",          build_slide_1),
        2: ("slide-2-how-it-works.png",  build_slide_2),
        3: ("slide-3-ailments.png",      build_slide_3),
    }

    targets = [args.slide] if args.slide else [1, 2, 3]
    for s in targets:
        name, fn = builders[s]
        path = fn(out_dir)
        print(f"  slide {s} -> {path}")


if __name__ == "__main__":
    main()

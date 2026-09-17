// Templates for the StrainEase Instagram launch set.
//
// All compositions are 1080px wide. Heights vary by format:
//   1080x1080  square feed post / carousel slide
//   1080x1350  portrait feed post (4:5, more screen real estate)
//   1080x1920  story / reel cover
//
// Visual system:
//   - Real StrainEase logo (from public/logo.svg) baked in via <img>
//   - Dark green canvas with soft radial glow sourced from the logo's
//     gradient endpoints, never a stock-purple gradient
//   - Figtree (regular + bold) display + body, IBM Plex Mono for meta, Lora italic
//     for the "voice of the patient" pull-quotes
//   - 21+ compliance pill always present (cannabis reg)

const fs = require('fs');
const path = require('path');
const { colors, fonts } = require('./_design.js');

// Inlined as data URI so render works without network.
const LOGO_SVG = fs.readFileSync(path.join(__dirname, '..', 'strainease-logo.svg'), 'utf8');
const LOGO_DATA_URI = 'data:image/svg+xml;utf8,' + encodeURIComponent(LOGO_SVG);

// Self-hosted Google Fonts CSS (Figtree + IBM Plex Mono + Lora).
// Loaded from ./fonts/* on disk — no network dependency at render time.
const FONT_CSS = fs.readFileSync(path.join(__dirname, '_fontcss.generated.css'), 'utf8');

// Total slide count across the kit. Page indicator shows "## of TOTAL".
const TOTAL_SLIDES = 11;

// Page indicator pill — always sage (no green tint), uniform across slides.
const pill = (n) => `<div class="pill">${String(n).padStart(2, '0')} of ${String(TOTAL_SLIDES).padStart(2, '0')}</div>`;

const baseStyles = () => `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --display: ${fonts.display};
    --body: ${fonts.body};
    --italic: ${fonts.italic};
    --mono: ${fonts.mono};
  }
  html, body { background: ${colors.bg}; color: ${colors.text}; font-family: ${fonts.body}; -webkit-font-smoothing: antialiased; overflow: hidden; }
  .stage {
    width: 100%; height: 100%;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 64px 72px;
    position: relative; overflow: hidden;
  }
  .stage::before {
    content: ""; position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 80% 110% at 90% 0%, ${colors.greenMid}33, transparent 70%),
      radial-gradient(ellipse 70% 110% at 0% 100%, ${colors.greenBright}22, transparent 65%);
    pointer-events: none;
  }

  .top  { display: grid; grid-template-columns: 1fr auto; align-items: center; z-index: 2; }
  .bot  { display: grid; grid-template-columns: 1fr auto; align-items: end; z-index: 2; }
  .body { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: 1fr; align-content: center; gap: 32px; z-index: 2; padding: 32px 0 24px; }

  .brand     { display: flex; align-items: center; gap: 16px; }
  .logo      { width: 56px; height: 56px; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 24px ${colors.green}33; }
  .logo img  { width: 100%; height: 100%; display: block; }
  .brand .nm { font-family: ${fonts.display}; font-weight: 600; font-size: 30px; letter-spacing: -0.02em; }

  .pill {
    font-family: ${fonts.mono}; font-size: 18px; padding: 9px 18px;
    border: 1px solid ${colors.line}; border-radius: 999px;
    color: ${colors.muted}; letter-spacing: 0.05em; text-transform: uppercase;
  }
  .pill.live { color: ${colors.greenBright}; border-color: ${colors.greenBright}55; background: ${colors.greenBright}11; }
  /* 21+ pill — same sage as the rest, no gold accent. Stands out by shape + text, not color. */
  .pill.age  { color: ${colors.muted}; border-color: ${colors.line}; background: ${colors.surface}; }

  .title  { font-family: ${fonts.display}; font-weight: 600; line-height: 1.05; letter-spacing: -0.025em; }
  .italic { font-family: ${fonts.italic}; font-style: italic; font-weight: 400; line-height: 1.15; letter-spacing: -0.015em; }
  .sub    { font-family: ${fonts.body}; color: ${colors.muted}; line-height: 1.5; }
  .em     { color: ${colors.greenBright}; }
  .accent { color: ${colors.amber}; }

  .card { background: ${colors.surface}; border: 1px solid ${colors.line}; border-radius: 22px; }

  .handle { font-family: ${fonts.mono}; color: ${colors.muted}; font-size: 22px; letter-spacing: 0.03em; }
  .url    { font-family: ${fonts.mono}; color: ${colors.text}; font-size: 22px; }
  /* fixed height on footer text rows so the bot bar stays at the same Y across slides */
  .handle, .url { line-height: 41px; min-height: 41px; display: flex; align-items: center; }

  .tag {
    font-family: ${fonts.mono}; font-size: 22px; padding: 14px 22px;
    border-radius: 999px; background: ${colors.surface2}; color: ${colors.text};
    border: 1px solid ${colors.line};
  }
  .src-pill {
    font-family: ${fonts.mono}; font-size: 22px; padding: 14px 22px;
    border-radius: 999px; background: ${colors.surface2}; color: ${colors.text};
    border: 1px solid ${colors.line};
  }

  .row       { display: grid; grid-auto-flow: column; gap: 12px; justify-content: start; }
  .between   { display: grid; grid-template-columns: 1fr auto; align-items: center; }
  /* dropcap quote mark — Figtree sans-serif, big, hangs at the top-left of the quote body */
  .dropcap {
    font-family: ${fonts.display};
    font-style: normal;
    font-weight: 700;
    font-size: 96px;
    color: ${colors.greenBright};
    line-height: 0.8;
    float: left;
    margin: 8px 16px 0 0;
  }

  .small     { font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: ${colors.muted}; font-family: ${fonts.mono}; }

  /* step-number + step-title — defined as classes so we never put
     font-family stacks inside inline style="" (commas + quotes break) */
  .num-step {
    flex: 0 0 auto;
    font-family: ${fonts.display};
    font-size: 48px; font-weight: 700;
    color: ${colors.greenBright}; line-height: 1;
  }
  .step-title {
    font-family: ${fonts.display};
    font-size: 24px; font-weight: 700;
    margin-bottom: 2px;
  }
  .step-sub {
    font-size: 18px;
  }

  .strain-row {
    display: grid;
    grid-template-rows: auto auto auto;
    gap: 6px;
    padding: 18px 28px; background: ${colors.surface};
    border: 1px solid ${colors.line}; border-radius: 14px;
  }
  .strain-row .nm    { font-family: ${fonts.display}; font-weight: 600; font-size: 44px; line-height: 1.05; }
  .strain-row .row  { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 12px; }
  /* mono meta — keeps "Hybrid · THC 17-24%" in IBM Plex Mono */
  .strain-row .meta { font-family: ${fonts.mono}; font-size: 22px; line-height: 1.2; color: ${colors.muted}; }
  /* sans meta — "Reported for:" and "42 patient voices cited" in Figtree */
  .strain-row .sub  { font-family: ${fonts.body}; font-size: 22px; line-height: 1.3; color: ${colors.muted}; }

  /* step card — used on portraitHow */
  .step-card {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    column-gap: 22px;
    padding: 18px 24px;
    background: ${colors.surface};
    border: 1px solid ${colors.line};
    border-radius: 16px;
  }

  /* step-stack — wraps the three step cards on portraitHow */
  .step-stack {
    display: grid;
    grid-template-rows: auto auto auto;
    gap: 16px;
  }

  /* (no more spacer — page indicator lives in the top-right pill on every slide) */

  .symptom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .symptom-chip {
    display: grid;
    grid-template-rows: auto auto;
    gap: 4px;
    font-family: ${fonts.mono}; font-size: 20px; padding: 18px 24px;
    background: ${colors.surface}; border: 1px solid ${colors.line};
    border-radius: 16px; color: ${colors.text};
  }
  /* "146 strains" — number and unit inline with a single space between them */
  .symptom-chip .num-line {
    font-family: ${fonts.display};
    line-height: 1;
    margin-bottom: 4px;
  }
  .symptom-chip .num {
    font-size: 44px; font-weight: 700;
    color: ${colors.greenBright};
    letter-spacing: -0.02em;
  }
  .symptom-chip .unit {
    font-size: 22px; font-weight: 500;
    color: ${colors.muted};
  }
  /* "to treat Anxiety" — prefix and ailment inline with a single space */
  .symptom-chip .treat-line {
    font-family: ${fonts.mono};
    font-size: 20px;
    line-height: 1.3;
    margin-top: 4px;
  }
  .symptom-chip .treat-prefix {
    color: ${colors.muted};
  }
  .symptom-chip .ailment {
    color: ${colors.text};
  }

  .terms { font-family: ${fonts.mono}; font-size: 16px; color: ${colors.dim}; line-height: 1.4; }

  .story-card-title { font-family: ${fonts.display}; font-size: 32px; font-weight: 600; line-height: 1.2; letter-spacing: -0.01em; }

  /* story card line — used for each row in the Now live card on slide 06 */
  .story-card { display: grid; row-gap: 20px; padding: 36px 40px; }
  .story-line { font-family: ${fonts.display}; font-size: 32px; font-weight: 600; line-height: 1.15; letter-spacing: -0.01em; color: ${colors.text}; }
  .story-line.eyebrow { color: ${colors.muted}; font-weight: 500; font-size: 24px; letter-spacing: 0.04em; text-transform: uppercase; }
  .story-line.url { color: ${colors.muted}; font-weight: 400; }

  /* type scale (kept under ~900px content width with 72px padding either side) */
  .t-hero   { font-size: 96px; }
  .t-large  { font-size: 78px; }
  .t-medium { font-size: 64px; }
  .t-quote  { font-size: 48px; line-height: 1.15 !important; }
  .sub-s    { font-size: 36px; }
  .sub-m    { font-size: 36px; }
  .sub-l    { font-size: 36px; }

  /* carousel-only scale — fill the 1080x1080 canvas more aggressively */
  .c-title  { font-size: 92px; line-height: 1.0; }
  .c-sub    { font-size: 36px; line-height: 1.4; }
  .c-src    { font-size: 22px; padding: 14px 22px; }
`;

const wrap = (body, w, h) => `<!doctype html><html><head><meta charset="utf-8"><style>
  ${FONT_CSS}
  body { width: ${w}px; height: ${h}px; }
  ${baseStyles()}
</style></head><body>${body}</body></html>`;

const brand = () => `
  <div class="brand">
    <div class="logo"><img src="${LOGO_DATA_URI}" alt="StrainEase"/></div>
    <div class="nm">StrainEase</div>
  </div>
`;

const age = () => `<div class="pill age">21+</div>`;

// ---------- 01 — SQUARE: What is StrainEase ----------
const squareIntro = () => wrap(`
  <div class="stage">
    <div class="top">${brand()}${pill(1)}</div>

    <div class="body">
      <div class="title t-medium">
        Compare strains<br/>
        for the way you<br/>
        <span class="italic em">actually feel.</span>
      </div>
      <div class="sub sub-s" style="max-width: 820px;">
        Patients describe what they are treating. StrainEase pulls the
        most-reported strains from Leafly, Weedmaps, Reddit, and Google.
      </div>
      <div class="row">
        <div class="src-pill">Leafly</div>
        <div class="src-pill">Weedmaps</div>
        <div class="src-pill">Reddit</div>
        <div class="src-pill">Google</div>
        <div class="src-pill">Dispensary menus</div>
      </div>
    </div>

    <div class="bot">
      <div class="handle">@strainease.ai</div>
      ${age()}
    </div>
  </div>
`, 1080, 1440);

// ---------- 02 — SQUARE: Patient voice (quote) ----------
const squareQuote = () => wrap(`
  <div class="stage">
    <div class="top">${brand()}${pill(2)}</div>

    <div class="body" style="gap: 28px;">
      <div class="t-quote" style="color: ${colors.text};">
        <span class="dropcap">"</span>I spent two months guessing at the dispensary. StrainEase showed me
        what <span class="em italic">other patients with my symptoms</span> kept
        coming back to. Same conversation my budtender wishes she had time for.
      </div>
      <div class="row" style="margin-top: 8px;">
        <div class="src-pill">r/medicalmarijuana</div>
        <div class="src-pill">Leafly reviews</div>
      </div>
      <div class="terms" style="margin-top: 6px;">
        Quote paraphrased from public patient discussions. Reported experience, not a recommendation.
      </div>
    </div>

    <div class="bot">
      <div class="handle">@strainease.ai</div>
      <div class="url">strainease.ai</div>
    </div>
  </div>
`, 1080, 1440);

// ---------- 03 — SQUARE: Symptom → strains matching ----------
const squareMatch = () => wrap(`
  <div class="stage">
    <div class="top">${brand()}${pill(3)}</div>

    <div class="body">
      <div class="title t-medium">Pick a symptom.<br/><span class="italic em">Get the shortlist.</span></div>

      <div class="symptom-grid">
        <div class="symptom-chip"><div class="num-line"><span class="num">146</span> <span class="unit">strains</span></div><span class="treat-line"><span class="treat-prefix">to treat</span> <span class="ailment">Anxiety</span></span></div>
        <div class="symptom-chip"><div class="num-line"><span class="num">115</span> <span class="unit">strains</span></div><span class="treat-line"><span class="treat-prefix">to treat</span> <span class="ailment">Depression</span></span></div>
        <div class="symptom-chip"><div class="num-line"><span class="num">100</span> <span class="unit">strains</span></div><span class="treat-line"><span class="treat-prefix">to treat</span> <span class="ailment">Stress</span></span></div>
        <div class="symptom-chip"><div class="num-line"><span class="num">73</span> <span class="unit">strains</span></div><span class="treat-line"><span class="treat-prefix">to treat</span> <span class="ailment">Chronic pain</span></span></div>
        <div class="symptom-chip"><div class="num-line"><span class="num">65</span> <span class="unit">strains</span></div><span class="treat-line"><span class="treat-prefix">to treat</span> <span class="ailment">Nausea</span></span></div>
        <div class="symptom-chip"><div class="num-line"><span class="num">42</span> <span class="unit">strains</span></div><span class="treat-line"><span class="treat-prefix">to treat</span> <span class="ailment">Insomnia</span></span></div>
      </div>
    </div>

    <div class="bot">
      <div class="handle">@strainease.ai</div>
      ${age()}
    </div>
  </div>
`, 1080, 1440);

// ---------- 04 — SQUARE: Sources / evidence ----------
const squareSources = () => wrap(`
  <div class="stage">
    <div class="top">${brand()}${pill(4)}</div>

    <div class="body">
      <div class="title t-medium">
        Every pick cites<br/>
        <span class="italic em">real patient voices.</span>
      </div>
      <div class="sub sub-s" style="max-width: 820px;">
        Five public sources, every voice cited.
      </div>
      <div class="strain-row">
        <div class="between">
          <div class="nm">Blue Dream</div>
          <div class="meta">Hybrid · THC 17–24%</div>
        </div>
        <div class="sub">Reported for: chronic pain · depression · stress</div>
        <div class="sub" style="color: ${colors.em};">42 patient voices cited</div>
      </div>
    </div>

    <div class="bot">
      <div class="handle">@strainease.ai</div>
      <div class="url">strainease.ai/strain/blue-dream</div>
    </div>
  </div>
`, 1080, 1440);

// ---------- 05 — How it works ----------
const portraitHow = () => wrap(`
  <div class="stage">
    <div class="top">${brand()}${pill(5)}</div>

    <div class="body" style="gap: 32px;">
      <div class="title t-medium">
        Three steps.<br/>
        <span class="italic em">Zero guesswork.</span>
      </div>

      <div class="step-stack">
        <div class="card step-card">
          <div class="num-step">01</div>
          <div>
            <div class="step-title">Tell us what you're treating</div>
            <div class="sub step-sub">Pick from a list or write it in your own words.</div>
          </div>
        </div>

        <div class="card step-card">
          <div class="num-step">02</div>
          <div>
            <div class="step-title">See the ranked shortlist</div>
            <div class="sub step-sub">Strains patients report most for those exact symptoms.</div>
          </div>
        </div>

        <div class="card step-card">
          <div class="num-step">03</div>
          <div>
            <div class="step-title">Compare finalists side by side</div>
            <div class="sub step-sub">Terpenes, THC range, cited voices. Take it to your dispensary.</div>
          </div>
        </div>
      </div>
    </div>

    <div class="bot">
      <div class="handle">@strainease.ai</div>
      ${age()}
    </div>
  </div>
`, 1080, 1440);

// ---------- 06 — Free / get the app ----------
const storyGet = () => wrap(`
  <div class="stage">
    <div class="top">${brand()}${pill(6)}</div>

    <div class="body" style="gap: 32px;">
      <div class="title t-medium">
        Strain matcher<br/>
        <span class="italic em">that listens to patients.</span>
      </div>

      <div class="sub sub-s" style="max-width: 800px;">
        Free. No card. No "results not typical." Tap the link in bio to compare strains for what you are dealing with.
      </div>

      <div class="card story-card">
        <div class="story-line eyebrow">Now live.</div>
        <div class="story-line">Web app + iOS</div>
        <div class="story-line url">strainease.ai · free in the App Store</div>
      </div>
    </div>

    <div class="bot">
      <div class="handle">@strainease.ai</div>
      ${age()}
    </div>
  </div>
`, 1080, 1440);

// ---------- 07 — Disclaimer / safety ----------
const storySafety = () => wrap(`
  <div class="stage">
    <div class="top">${brand()}${pill(7)}</div>

    <div class="body" style="gap: 32px;">
      <div class="title" style="font-size: 64px; line-height: 1.0;">
        We are <span class="italic em">not</span> your doctor.<br/>
        <span style="color: ${colors.muted};">And we don't want to be.</span>
      </div>

      <div class="sub sub-s" style="max-width: 820px; line-height: 1.5;">
        StrainEase is a research and comparison tool built from what patients
        publicly say about their experience. Nothing here is a diagnosis,
        prescription, or treatment recommendation.
        Talk to a qualified healthcare provider before using cannabis
        medically, especially if you take other medication.
      </div>

      <div class="row" style="margin-top: 4px;">
        <div class="tag">Patient voices, not prescriptions</div>
        <div class="tag">21+ only</div>
        <div class="tag">Cite every claim</div>
      </div>
    </div>

    <div class="bot">
      <div class="handle">@strainease.ai</div>
      <div class="url">strainease.ai</div>
    </div>
  </div>
`, 1080, 1440);

// ---------- CAROUSEL: "Find your match in 5 slides" ----------
function carouselSlide({ big, italic = false, sub, sources, slide, total }) {
  return wrap(`
    <div class="stage">
      <div class="top">${brand()}${pill(7 + slide)}</div>

      <div class="body">
        <div class="title ${italic ? 'italic' : ''} c-title">
          ${big}
        </div>
        ${sub ? `<div class="sub c-sub" style="max-width: 860px;">${sub}</div>` : ''}
        ${sources ? `<div class="row">${sources.map(s => `<div class="src-pill c-src">${s}</div>`).join('')}</div>` : ''}
      </div>

      <div class="bot">
        <div class="handle">@strainease.ai</div>
        ${age()}
      </div>
    </div>
  `, 1080, 1440);
}

const CAROUSEL = [
  {
    big: 'Every patient is<br/>running their<br/><span class="em italic">own experiment.</span>',
    italic: true,
    sub: 'Cannabis affects everyone differently. The most useful data is what other patients with your symptoms keep coming back to, not what a product page says.',
  },
  {
    big: 'StrainEase aggregates<br/>five public sources.',
    sub: 'Leafly reviews, Weedmaps listings, Reddit threads in r/medicalmarijuana, Google discussion, and live dispensary menus. You see exactly who said what.',
    sources: ['Leafly', 'Weedmaps', 'Reddit', 'Google', 'Dispensary menus'],
  },
  {
    big: 'Symptoms in.<br/><span class="em italic">Shortlist out.</span>',
    italic: true,
    sub: 'Tell us what you are treating. We cover pain, sleep, anxiety, ADHD, focus, and more. Get a ranked shortlist of strains patients most often report for those exact symptoms.',
  },
  {
    big: 'Every pick<br/>cites its voices.',
    sub: 'Tap any strain on a list to read the patient discussions behind its ranking. Terpenes, THC range, and the people who reported it. No black box.',
  },
];

const carouselSlides = CAROUSEL.map((s, i, arr) =>
  carouselSlide({
    big: s.big,
    italic: s.italic,
    sub: s.sub,
    sources: s.sources,
    slide: i + 1,
    total: arr.length,
  })
);

module.exports = {
  squareIntro,
  squareQuote: squareQuote,
  squareMatch,
  squareSources,
  portraitHow,
  storyGet,
  storySafety,
  carouselSlides,
};

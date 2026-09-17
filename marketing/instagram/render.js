// Renders every StrainEase Instagram template to PNG at native spec sizes.
// Each HTML doc is written to disk first so that relative font paths
// (./fonts/*.woff2) resolve correctly under Playwright.

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const T = require('./_templates.js');

const OUT = path.join(__dirname, 'rendered');
const HTML_DIR = __dirname;  // write next to fonts/ so relative paths resolve
fs.rmSync(OUT,    { recursive: true, force: true });
// Don't delete HTML_DIR — it's the live source dir!
fs.mkdirSync(OUT, { recursive: true });

const jobs = [
  { name: '01_square_intro',     html: T.squareIntro(),  w: 1080, h: 1440 },
  { name: '02_square_quote',     html: T.squareQuote(),  w: 1080, h: 1440 },
  { name: '03_square_match',     html: T.squareMatch(),  w: 1080, h: 1440 },
  { name: '04_square_sources',   html: T.squareSources(),w: 1080, h: 1440 },
  { name: '05_portrait_how',     html: T.portraitHow(),  w: 1080, h: 1440 },
  { name: '06_story_get',        html: T.storyGet(),     w: 1080, h: 1440 },
  { name: '07_story_safety',     html: T.storySafety(),  w: 1080, h: 1440 },
  ...T.carouselSlides.map((html, i) => ({
    name: `08_carousel_${String(i + 1).padStart(2, '0')}`,
    html, w: 1080, h: 1440,
  })),
];

(async () => {
  const browser = await chromium.launch({
    executablePath: '/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const ctx = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  for (const j of jobs) {
    // Write each HTML to disk so font URLs resolve as file://.../fonts/...
    const htmlFile = path.join(HTML_DIR, `__render_${j.name}.html`);
    fs.writeFileSync(htmlFile, j.html);
    await page.setViewportSize({ width: j.w, height: j.h });
    await page.goto('file://' + htmlFile, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForTimeout(1200);

    const file = path.join(OUT, `${j.name}.png`);
    await page.screenshot({ path: file, type: 'png', omitBackground: false });
    console.log('wrote', file);
  }

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

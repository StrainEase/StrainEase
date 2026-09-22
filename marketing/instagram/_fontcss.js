// Self-hosted font CSS — generated from Google Fonts and rewritten to
// point at ./fonts/*.woff2. Dumped inline into every rendered HTML so we
// don't depend on the Playwright sandbox reaching fonts.gstatic.com.

const fs = require('fs');
const path = require('path');

const SRC = '/tmp/fonts.css';
let css = fs.readFileSync(SRC, 'utf8');

// Rewrite Google CDN URLs to local paths.
// e.g. https://fonts.gstatic.com/s/figtree/v9/_Xms-...woff2 -> fonts/_Xms-...woff2
css = css.replace(/https:\/\/fonts\.gstatic\.com\/[^)]+/g, (url) => {
  const fname = url.split('/').pop();
  return `fonts/${fname}`;
});

// Set font-display to swap + force-install as a font-face block.
const out = `
  /* Self-hosted Google Fonts — Figtree / IBM Plex Mono / Lora */
  ${css}
`;
fs.writeFileSync('/workspace/marketing/instagram/_fontcss.generated.css', out);
console.log('wrote _fontcss.generated.css', out.length, 'chars,', out.split('@font-face').length - 1, 'font-faces');

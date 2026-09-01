#!/usr/bin/env node
// Post-build: copy non-TS assets that the compiled functions reference
// at runtime (currently just the brand SVG used by the clinician PDF
// generator). Run automatically after `tsc` via `npm run build`.

import { copyFile, mkdir, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "lib");

const ASSETS = [
  { from: join(SRC, "assets", "clinician-report-logo.svg"), to: join(OUT, "clinician-report-logo.svg") },
];

for (const { from, to } of ASSETS) {
  try {
    await access(from);
  } catch {
    // Source not present (e.g. in CI before the brand asset is added).
    // Skip silently — the function has a runtime fallback.
    continue;
  }
  await mkdir(dirname(to), { recursive: true });
  await copyFile(from, to);
  console.log(`copied ${from.replace(ROOT + "/", "")} → ${to.replace(ROOT + "/", "")}`);
}

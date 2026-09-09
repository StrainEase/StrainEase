// lint-staged runs these commands on files staged for commit. Keep it
// fast: per-file only, no repo-wide scans. Full-repo checks (tsc, full
// `prettier --check`) live in the pre-push hook.
//
// `eslint --fix` may rewrite the file; `prettier --write` re-formats
// whatever ESLint produced. Order matters.

export default {
  // JS / TS files: lint-fix first, then re-format. ESLint honors the
  // `files` patterns in eslint.config.js (frontend / backend / scripts)
  // and skips anything in the global `ignores` (ios/, android/, etc.).
  "*.{ts,tsx,js,mjs,cjs}": [
    "eslint --fix --no-warn-ignored",
    "prettier --write",
  ],
  // Non-code: Prettier only.
  "*.{json,css,md,yml,yaml,mdx}": ["prettier --write"],
};

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default tseslint.config(
  {
    // Paths that never participate in linting.
    ignores: [
      "dist",
      "functions/lib",
      // Native codebases: Swift / Kotlin are linted by their own toolchains
      // (Xcode + ktlint/detekt). See AGENTS.md for the Android port plan.
      "ios",
      "android",
      // Generated vendor scaffolding.
      ".ai",
      ".firebase",
    ],
  },
  // Frontend: src/ + root config files. Browser globals + React plugins.
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      eslintConfigPrettier,
    ],
    files: ["src/**/*.{ts,tsx}", "*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Most of the codebase's `useEffect` blocks synchronize with external
      // systems (Firestore subscriptions, localStorage hydration, URL params,
      // browser APIs). The flagged patterns ("reset on prop change",
      // "hydrate from storage on mount", and "conditional subscribe/reset")
      // are the right shape for those systems; the React Compiler bails on
      // them today but the runtime behavior is correct and the alternatives
      // (useSyncExternalStore everywhere, prop remount keys) would be a much
      // larger refactor than the benefit warrants.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Backend: functions/ (Firebase Functions, Node 22). No React plugins.
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      eslintConfigPrettier,
    ],
    files: ["functions/src/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node, ...globals.es2024 },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Allow top-level `await` and `for await` loops in seed scripts.
      "no-await-in-loop": "off",
    },
  },
  // Repo scripts: Node-only .mjs / .js / .cjs / .ts (AI tooling, build glue).
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      eslintConfigPrettier,
    ],
    files: ["scripts/**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node, ...globals.es2024 },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // `scripts/*` is a free-form bag of dev glue; permit console output.
      "no-console": "off",
    },
  },
);

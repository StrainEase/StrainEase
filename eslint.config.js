import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      eslintConfigPrettier,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
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
      // browser APIs). The flagged patterns — "reset on prop change",
      // "hydrate from storage on mount", and "conditional subscribe/reset"
      // — are the right shape for those systems; the React Compiler
      // bails on them today but the runtime behavior is correct and the
      // alternatives (useSyncExternalStore everywhere, prop remount keys)
      // would be a much larger refactor than the benefit warrants.
      "react-hooks/set-state-in-effect": "off",
    },
  },
);

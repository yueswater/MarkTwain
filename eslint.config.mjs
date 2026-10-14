import tsParser from "@typescript-eslint/parser";
import i18next from "eslint-plugin-i18next";

// Only this rule is on, text in the UI always goes through i18n.
export default [
  { ignores: ["**/out/**", "**/dist/**", "**/node_modules/**", "resources/**", "docs/**"] },
  {
    files: ["apps/desktop/src/renderer/src/**/*.tsx"],
    languageOptions: { parser: tsParser },
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": ["error", { mode: "jsx-text-only" }],
    },
  },
];

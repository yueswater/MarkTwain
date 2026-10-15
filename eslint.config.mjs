import tsParser from "@typescript-eslint/parser";
import i18next from "eslint-plugin-i18next";

// Two rules are on: text in the UI always goes through i18n, and the parts of the app keep to their sides.
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
  // The back end, the front end and the code that both share do not reach into each other, they talk through the IPC contract in shared
  {
    files: ["apps/desktop/src/renderer/**/*.{ts,tsx}"],
    // A test may read files and use the translator of the back end
    ignores: ["**/*.test.ts"],
    languageOptions: { parser: tsParser },
    rules: { "no-restricted-imports": ["error", { patterns: [{ group: ["**/main/**", "electron", "node:*"], message: "The front end does not use the back end, Electron or Node. Ask through the IPC contract." }] }] },
  },
  {
    files: ["apps/desktop/src/main/**/*.ts"],
    languageOptions: { parser: tsParser },
    rules: { "no-restricted-imports": ["error", { patterns: [{ group: ["**/renderer/**"], message: "The back end does not use the front end." }] }] },
  },
  {
    files: ["apps/desktop/src/shared/**/*.ts"],
    languageOptions: { parser: tsParser },
    rules: { "no-restricted-imports": ["error", { patterns: [{ group: ["**/main/**", "**/renderer/**"], message: "What both sides share depends on neither side." }] }] },
  },
  // The libraries do not know the app that uses them
  {
    files: ["packages/*/src/**/*.ts"],
    languageOptions: { parser: tsParser },
    rules: { "no-restricted-imports": ["error", { patterns: [{ group: ["**/apps/**", "electron"], message: "A package does not depend on the app." }] }] },
  },
];

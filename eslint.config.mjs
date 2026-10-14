import tsParser from "@typescript-eslint/parser";
import i18next from "eslint-plugin-i18next";

// 只啟用這一條規則：UI 的文字一律走 i18n（規格 3.5 節）。
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

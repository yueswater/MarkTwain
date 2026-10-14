/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/*.test.tsx"],
  // markdown-it-cjk-friendly and its dependency are published as ESM only, other packages stay untransformed
  transformIgnorePatterns: ["/node_modules/(?!.*(markdown-it-cjk-friendly|get-east-asian-width|tex2typst))"],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          target: "es2022",
          parser: { syntax: "typescript", tsx: true },
          transform: { react: { runtime: "automatic" } },
        },
      },
    ],
  },
};

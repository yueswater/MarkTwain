/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/*.test.tsx"],
  // markdown-it-cjk-friendly 與它的相依套件只發佈 ESM；其餘套件維持不轉譯
  transformIgnorePatterns: ["/node_modules/(?!.*(markdown-it-cjk-friendly|get-east-asian-width))"],
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

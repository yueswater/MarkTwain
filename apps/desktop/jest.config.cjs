const base = require("../../jest.base.cjs");

module.exports = {
  ...base,
  // Same as the @ alias in electron.vite.config.ts and tsconfig.json
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/renderer/src/$1" },
};

const base = require("../../jest.base.cjs");

module.exports = {
  ...base,
  // 與 electron.vite.config.ts 與 tsconfig.json 的 "@" 別名一致
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/renderer/src/$1" },
};

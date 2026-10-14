import { describe, expect, it } from "@jest/globals";
import { createBackupPath } from "./backup.helper";

describe("createBackupPath", () => {
  it("在原檔名後加上 .bak- 與 UTC 時間", () => {
    const now = new Date(Date.UTC(2026, 9, 4, 3, 5, 9));
    expect(createBackupPath("/x/論文 a.marktwain", now)).toBe("/x/論文 a.marktwain.bak-20261004-030509");
  });
});

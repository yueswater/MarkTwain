import { describe, expect, it } from "@jest/globals";
import { createLabel, findDuplicateLabels, isValidLabel, labelKind } from "./labels";

describe("isValidLabel", () => {
  it("接受 cha、sec、fig、tbl、eq、lst 開頭的標籤", () => {
    for (const label of ["cha:intro", "sec:method", "fig:a3f9", "tbl:results", "eq:energy", "lst:code-1"]) {
      expect(isValidLabel(label)).toBe(true);
    }
  });

  it("接受名稱中的底線、句點、冒號與連字號", () => {
    expect(isValidLabel("fig:a_b.c:d-e")).toBe(true);
  });

  it("拒絕未知的前綴", () => {
    expect(isValidLabel("foo:bar")).toBe(false);
  });

  it("拒絕沒有名稱、空白或中文的標籤", () => {
    expect(isValidLabel("fig:")).toBe(false);
    expect(isValidLabel("fig:a b")).toBe(false);
    expect(isValidLabel("fig:圖一")).toBe(false);
    expect(isValidLabel("")).toBe(false);
  });
});

describe("labelKind", () => {
  it("回傳前綴", () => {
    expect(labelKind("tbl:x")).toBe("tbl");
  });

  it("無效的標籤回傳 null", () => {
    expect(labelKind("nope")).toBeNull();
  });
});

describe("findDuplicateLabels", () => {
  it("回傳出現不只一次的標籤，每個只列一次", () => {
    expect(findDuplicateLabels(["fig:a", "tbl:b", "fig:a", "fig:a", "tbl:b", "eq:c"])).toEqual([
      "fig:a",
      "tbl:b",
    ]);
  });

  it("沒有重複時回傳空陣列", () => {
    expect(findDuplicateLabels(["fig:a", "fig:b"])).toEqual([]);
  });
});

describe("createLabel", () => {
  it("產生指定種類的有效標籤", () => {
    const label = createLabel("fig", new Set());
    expect(label).toMatch(/^fig:[0-9a-f]{4}$/);
    expect(isValidLabel(label)).toBe(true);
  });

  it("不與既有標籤衝突", () => {
    // The random source always gives 0000 first and then 0001
    const values = [0, 0, 1 / 65536];
    let i = 0;
    const random = () => values[i++] ?? 0.5;
    expect(createLabel("fig", new Set(["fig:0000"]), random)).toBe("fig:0001");
  });
});

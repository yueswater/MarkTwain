import { describe, expect, it } from "@jest/globals";
import { resolveNumbers } from "./numbering";
import type { Target } from "./types";

const fig = (label: string): Target => ({ kind: "fig", label });
const tbl = (label: string): Target => ({ kind: "tbl", label });
const eq = (label: string): Target => ({ kind: "eq", label });
const cha = (label: string, text: string): Target => ({ kind: "cha", label, text });
const sec = (label: string, text: string): Target => ({ kind: "sec", label, text });

const options = { equationNumbering: "all", numberPerChapter: false } as const;

describe("resolveNumbers", () => {
  it("圖與表分別依文件順序編號", () => {
    const { numbers } = resolveNumbers([fig("fig:a"), tbl("tbl:a"), fig("fig:b"), tbl("tbl:b")], [], options);
    expect(numbers.get("fig:a")).toBe("1");
    expect(numbers.get("fig:b")).toBe("2");
    expect(numbers.get("tbl:a")).toBe("1");
    expect(numbers.get("tbl:b")).toBe("2");
  });

  it("公式在 all 模式下全部編號，在 none 模式下都不編號", () => {
    const targets = [eq("eq:a"), eq("eq:b")];
    expect(resolveNumbers(targets, [], options).numbers.get("eq:b")).toBe("2");
    const none = resolveNumbers(targets, [], { ...options, equationNumbering: "none" });
    expect(none.numbers.has("eq:a")).toBe(false);
  });

  it("章與節的引用顯示標題文字", () => {
    const { numbers } = resolveNumbers([cha("cha:i", "緒論"), sec("sec:m", "研究方法")], [], options);
    expect(numbers.get("cha:i")).toBe("緒論");
    expect(numbers.get("sec:m")).toBe("研究方法");
  });

  it("只有公式可以逐章重編，編號會帶章號，圖表整篇連續", () => {
    const eq = (label: string) => ({ kind: "eq" as const, label });
    const targets = [cha("cha:1", "一"), eq("eq:a"), eq("eq:b"), fig("fig:a"), cha("cha:2", "二"), eq("eq:c"), fig("fig:b"), tbl("tbl:a")];
    const { numbers } = resolveNumbers(targets, [], { ...options, numberPerChapter: true });
    expect(numbers.get("eq:a")).toBe("1.1");
    expect(numbers.get("eq:b")).toBe("1.2");
    expect(numbers.get("eq:c")).toBe("2.1");
    expect(numbers.get("fig:a")).toBe("1");
    expect(numbers.get("fig:b")).toBe("2");
    expect(numbers.get("tbl:a")).toBe("1");
  });

  it("公式逐章重編但還沒有任何章時，視為第 0 章", () => {
    const { numbers } = resolveNumbers([{ kind: "eq", label: "eq:a" }], [], { ...options, numberPerChapter: true });
    expect(numbers.get("eq:a")).toBe("0.1");
  });

  it("引用不存在的目標時列為失效", () => {
    const result = resolveNumbers([fig("fig:a")], ["fig:a", "fig:gone", "tbl:gone"], options);
    expect(result.broken).toEqual(["fig:gone", "tbl:gone"]);
  });

  it("重複的標籤以第一次出現為準，並列為重複", () => {
    const result = resolveNumbers([fig("fig:a"), fig("fig:a"), fig("fig:b")], [], options);
    expect(result.numbers.get("fig:a")).toBe("1");
    expect(result.numbers.get("fig:b")).toBe("2");
    expect(result.duplicates).toEqual(["fig:a"]);
  });

  it("刪除目標後，後面的編號往前補", () => {
    const before = resolveNumbers([fig("fig:a"), fig("fig:b"), fig("fig:c")], [], options);
    const after = resolveNumbers([fig("fig:a"), fig("fig:c")], [], options);
    expect(before.numbers.get("fig:c")).toBe("3");
    expect(after.numbers.get("fig:c")).toBe("2");
  });
});

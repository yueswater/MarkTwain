import { describe, expect, it } from "@jest/globals";
import { citationDisplay, citationText, describeRef } from "./ref-display";

const kinds: Record<string, string> = { fig: "圖", tbl: "表", eq: "式" };
const name = (kind: string) => kinds[kind] ?? kind;
const numbers = { "fig:a": "1.2", "cha:intro": "緒論", "eq:x": "3.1" };

describe("describeRef", () => {
  it("圖表公式顯示種類加編號", () => {
    expect(describeRef("fig:a", numbers, name, "找不到")).toEqual({ text: "圖 1.2", broken: false });
    expect(describeRef("eq:x", numbers, name, "找不到")).toEqual({ text: "式 3.1", broken: false });
  });

  it("章節直接顯示標題", () => {
    expect(describeRef("cha:intro", numbers, name, "找不到")).toEqual({ text: "緒論", broken: false });
  });

  it("目標不存在或標籤格式不對時標為失效", () => {
    expect(describeRef("fig:gone", numbers, name, "找不到")).toEqual({ text: "找不到 fig:gone", broken: true });
    expect(describeRef("", numbers, name, "找不到")).toEqual({ text: "找不到", broken: true });
  });
});

describe("citationText", () => {
  it("括號形式加括號，多個 key 以分號隔開", () => {
    expect(citationText(["wang2020", "lee2019"], "paren")).toBe("(wang2020; lee2019)");
    expect(citationText(["wang2020"], "prose")).toBe("wang2020");
  });
});

describe("citationDisplay", () => {
  const info = { wang2020: { author: "Wang", year: "2020" }, lee2019: { author: "Lee & Kim", year: "2019" } };

  it("shows author and year of known keys in each form", () => {
    expect(citationDisplay(["wang2020", "lee2019"], "paren", info)).toEqual({ text: "(Wang, 2020; Lee & Kim, 2019)", broken: false });
    expect(citationDisplay(["wang2020"], "prose", info).text).toBe("Wang (2020)");
    expect(citationDisplay(["wang2020"], "author", info).text).toBe("Wang");
    expect(citationDisplay(["wang2020"], "year", info).text).toBe("2020");
  });

  it("keeps the key of an unknown entry and marks it broken", () => {
    expect(citationDisplay(["wang2020", "ghost"], "paren", info)).toEqual({ text: "(Wang, 2020; ghost)", broken: true });
    expect(citationDisplay(["ghost"], "paren")).toEqual({ text: "(ghost)", broken: true });
  });

  it("falls back to the key when the entry has no author or year", () => {
    const bare = { k: { author: "", year: "" } };
    expect(citationDisplay(["k"], "paren", bare).text).toBe("(k)");
    expect(citationDisplay(["k"], "year", bare).text).toBe("k");
  });
});

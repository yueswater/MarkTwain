import { describe, expect, it } from "@jest/globals";
import { citationText, describeRef } from "./ref-display";

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

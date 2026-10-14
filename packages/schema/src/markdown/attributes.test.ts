import { describe, expect, it } from "@jest/globals";
import { formatAttributes, parseAttributes } from "./attributes";

describe("parseAttributes", () => {
  it("解析 id、class 與 key=value", () => {
    expect(parseAttributes("#fig:one .figrow width=60%")).toEqual({
      id: "fig:one",
      classes: ["figrow"],
      props: { width: "60%" },
    });
  });

  it("可以有多個 class，順序保留", () => {
    expect(parseAttributes(".a .b .c")?.classes).toEqual(["a", "b", "c"]);
  });

  it("值可以用雙引號包起來，裡面可以有空白", () => {
    expect(parseAttributes('#tbl:one notes="資料來源：教務處"')?.props).toEqual({
      notes: "資料來源：教務處",
    });
  });

  it("引號裡的跳脫：\\\" 與 \\\\", () => {
    expect(parseAttributes('caption="他說 \\"好\\" \\\\ 對"')?.props).toEqual({
      caption: '他說 "好" \\ 對',
    });
  });

  it("沒有任何屬性時回傳空結構", () => {
    expect(parseAttributes("")).toEqual({ id: null, classes: [], props: {} });
  });

  it("忽略多餘的空白", () => {
    expect(parseAttributes("  #a   .b  k=v ")).toEqual({ id: "a", classes: ["b"], props: { k: "v" } });
  });

  it("格式錯誤時回傳 null（例如引號沒有結束）", () => {
    expect(parseAttributes('k="oops')).toBeNull();
    expect(parseAttributes("???")).toBeNull();
  });
});

describe("formatAttributes", () => {
  it("輸出順序固定：id、class、key=value（key 依字母順序）", () => {
    expect(
      formatAttributes({ id: "fig:one", classes: ["figrow"], props: { width: "60%", caption: "x" } }),
    ).toBe("{#fig:one .figrow caption=x width=60%}");
  });

  it("值含空白、引號或特殊字元時加上雙引號並跳脫", () => {
    expect(formatAttributes({ id: null, classes: [], props: { notes: "a b" } })).toBe('{notes="a b"}');
    expect(formatAttributes({ id: null, classes: [], props: { c: '他說 "好"' } })).toBe(
      '{c="他說 \\"好\\""}',
    );
  });

  it("空的屬性輸出空字串", () => {
    expect(formatAttributes({ id: null, classes: [], props: {} })).toBe("");
  });

  it("輸出後再解析會得到相同的結果", () => {
    const attrs = {
      id: "tbl:x",
      classes: ["a", "b"],
      props: { notes: '含 "引號" 與 \\ 反斜線', empty: "" },
    };
    expect(parseAttributes(formatAttributes(attrs).slice(1, -1))).toEqual(attrs);
  });
});

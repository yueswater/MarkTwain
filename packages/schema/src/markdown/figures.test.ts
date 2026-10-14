import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { parseMarkdown } from "./parse";
import { serializeMarkdown } from "./serialize";

const text = (value: string) => ({ type: "text", text: value });
const p = (...content: unknown[]) => ({ type: "paragraph", content });
const doc = (...content: unknown[]) => ({ type: "doc" as const, content });
const figure = (src: string, caption = "", label: string | null = null, width: string | null = null) => ({
  type: "figure",
  attrs: { src, caption, label, width },
});
const group = (
  children: unknown[],
  attrs: Partial<{ label: string | null; caption: string; layout: string; columns: string | null }> = {},
) => ({
  type: "figureGroup",
  attrs: { label: null, caption: "", layout: "row", columns: null, ...attrs },
  content: children,
});
const div = (classes: string[], children: unknown[], id: string | null = null, props: Record<string, string> = {}) => ({
  type: "div",
  attrs: { id, classes, props },
  content: children,
});

describe("圖：解析", () => {
  it("獨立成段的圖片是 figure，標題、標籤與寬度來自屬性", () => {
    expect(parseMarkdown("![系統架構](figures/a.png){#fig:one width=60%}").content[0]).toEqual(
      figure("figures/a.png", "系統架構", "fig:one", "60%"),
    );
  });

  it("沒有屬性與標題也可以", () => {
    expect(parseMarkdown("![](a.png)").content[0]).toEqual(figure("a.png"));
  });

  it("路徑保持原樣：中文、空白（用 <…> 寫法）", () => {
    expect(parseMarkdown("![c](figures/圖一.png)").content[0]).toEqual(figure("figures/圖一.png", "c"));
    expect(parseMarkdown("![c](<fig 1.png>)").content[0]).toEqual(figure("fig 1.png", "c"));
  });

  it("標題是行內 Markdown 原文，可以含公式", () => {
    expect(parseMarkdown("![速度 $v=at$](a.png)").content[0]).toEqual(figure("a.png", "速度 $v=at$"));
  });

  it("標題裡跳脫的中括號會還原", () => {
    expect(parseMarkdown("![a \\[b\\]](a.png)").content[0]).toEqual(figure("a.png", "a [b]"));
  });

  it("夾在文字中間的圖片降級成文字，不會報錯", () => {
    expect(parseMarkdown("前 ![c](a.png) 後").content[0]).toEqual(p(text("前 ![c](a.png) 後")));
  });
});

describe("並排圖與一般 div：解析", () => {
  const md = "::: {#fig:row .figrow}\n![甲](a.png)\n\n![乙](b.png)\n\n函數圖形\n:::";

  it("figrow：圖加上最後一段的總標題", () => {
    expect(parseMarkdown(md).content[0]).toEqual(
      group([figure("a.png", "甲"), figure("b.png", "乙")], { label: "fig:row", caption: "函數圖形" }),
    );
  });

  it("figgrid 與欄數", () => {
    expect(parseMarkdown("::: {.figgrid columns=2}\n![a](a.png)\n\n![b](b.png)\n:::").content[0]).toEqual(
      group([figure("a.png", "a"), figure("b.png", "b")], { layout: "grid", columns: "2" }),
    );
  });

  it("內容不符合時保持一般 div，不丟東西", () => {
    expect(parseMarkdown("::: {.figrow}\n中間夾一段文字\n\n![b](b.png)\n:::").content[0]).toEqual(
      div(["figrow"], [p(text("中間夾一段文字")), figure("b.png", "b")]),
    );
  });

  it("一般 div：class、id 與其他屬性", () => {
    expect(parseMarkdown("::: {#a .abstract-zh k=v}\n內文\n:::").content[0]).toEqual(
      div(["abstract-zh"], [p(text("內文"))], "a", { k: "v" }),
    );
  });

  it("只寫一個單字就是 class", () => {
    expect(parseMarkdown("::: abstract-en\n內文\n:::").content[0]).toEqual(div(["abstract-en"], [p(text("內文"))]));
  });

  it("可以巢狀，內層的結尾不會提早關閉外層", () => {
    const d = parseMarkdown("::: outer\n::: inner\n內文\n:::\n\n後\n:::").content[0] as { content: unknown[] };
    expect(d).toEqual(div(["outer"], [div(["inner"], [p(text("內文"))]), p(text("後"))]));
  });

  it("沒有結尾的 :::  不是 div", () => {
    expect((parseMarkdown("::: x\n內文").content[0] as { type: string }).type).toBe("paragraph");
  });
});

describe("序列化", () => {
  it("圖", () => {
    expect(serializeMarkdown(doc(figure("a.png", "系統架構", "fig:one", "60%")))).toBe(
      "![系統架構](a.png){#fig:one width=60%}\n",
    );
    expect(serializeMarkdown(doc(figure("a.png")))).toBe("![](a.png)\n");
  });

  it("含空白或括號的路徑用 <…>；標題裡的中括號跳脫", () => {
    expect(serializeMarkdown(doc(figure("fig 1.png", "a [b]")))).toBe("![a \\[b\\]](<fig 1.png>)\n");
    expect(serializeMarkdown(doc(figure("a(1).png")))).toBe("![](<a(1).png>)\n");
  });

  it("並排圖：結尾 ::: 與總標題", () => {
    expect(
      serializeMarkdown(doc(group([figure("a.png", "甲"), figure("b.png", "乙")], { label: "fig:row", caption: "函數圖形" }))),
    ).toBe("::: {#fig:row .figrow}\n![甲](a.png)\n\n![乙](b.png)\n\n函數圖形\n:::\n");
  });

  it("網格圖輸出 .figgrid 與欄數；沒有總標題時不輸出標題段", () => {
    expect(
      serializeMarkdown(doc(group([figure("a.png")], { layout: "grid", columns: "2" }))),
    ).toBe("::: {.figgrid columns=2}\n![](a.png)\n:::\n");
  });

  it("一般 div", () => {
    expect(serializeMarkdown(doc(div(["abstract-zh"], [p(text("內文"))], "a", { k: "v" })))).toBe(
      "::: {#a .abstract-zh k=v}\n內文\n:::\n",
    );
  });

  it("div 裡有清單時，結尾的 ::: 緊接最後一項", () => {
    const list = { type: "bulletList", content: [{ type: "listItem", content: [p(text("x"))] }] };
    expect(serializeMarkdown(doc(div(["a"], [list])))).toBe("::: {.a}\n- x\n:::\n");
  });
});

describe("往返", () => {
  it.each([
    "![系統架構](figures/a.png){#fig:one width=60%}\n",
    "::: {#fig:row .figrow}\n![甲](a.png)\n\n![乙](b.png)\n\n函數圖形 $x$\n:::\n",
    "::: {.figgrid columns=2}\n![](a.png)\n\n![](b.png)\n:::\n",
    "::: {.abstract-zh}\n第一段\n\n第二段\n:::\n\n::: {.abstract-en}\nOne\n:::\n",
    "::: {.outer}\n::: {.inner}\n內文\n:::\n\n後\n:::\n",
    "![c](<fig 1.png>)\n",
  ])("規範形式不變：%j", (markdown) => {
    expect(serializeMarkdown(parseMarkdown(markdown))).toBe(markdown);
  });

  it("任何路徑與標題的圖都能原樣往返", () => {
    const path = fc
      .string({ unit: fc.constantFrom(..."abc 圖一/_-.()012"), minLength: 1, maxLength: 14 })
      .filter((s) => s === s.trim() && !/^\./.test(s));
    const caption = fc
      .string({ unit: fc.constantFrom(..."abc 圖一[]*_x"), minLength: 0, maxLength: 12 })
      .map((s) => s.replace(/[*_]/g, "").trim());
    fc.assert(
      fc.property(path, caption, fc.constantFrom(null, "fig:a"), fc.constantFrom(null, "50%"), (src, cap, label, width) => {
        const input = doc(figure(src, cap, label, width));
        expect(parseMarkdown(serializeMarkdown(input))).toEqual(input);
        return true;
      }),
      { numRuns: 400 },
    );
  });
});

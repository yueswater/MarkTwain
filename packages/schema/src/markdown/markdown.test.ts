import { describe, expect, it } from "@jest/globals";
import { parseMarkdown } from "./parse";
import { serializeMarkdown } from "./serialize";

const text = (value: string, marks?: Array<{ type: string; attrs?: Record<string, unknown> }>) => ({
  type: "text",
  text: value,
  ...(marks ? { marks } : {}),
});
const p = (...content: unknown[]) => ({ type: "paragraph", content });

describe("parseMarkdown", () => {
  it("段落", () => {
    expect(parseMarkdown("你好 world")).toEqual({ type: "doc", content: [p(text("你好 world"))] });
  });

  it("空文件至少有一個空段落", () => {
    expect(parseMarkdown("")).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
    expect(parseMarkdown("\n\n  \n")).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });

  it("標題與標籤", () => {
    const doc = parseMarkdown("# 緒論 {#cha:intro}\n\n## 背景");
    expect(doc.content[0]).toEqual({
      type: "heading",
      attrs: { level: 1, label: "cha:intro" },
      content: [text("緒論")],
    });
    expect(doc.content[1]).toEqual({
      type: "heading",
      attrs: { level: 2, label: null },
      content: [text("背景")],
    });
  });

  it("粗體、斜體、刪除線、行內程式碼與連結", () => {
    const doc = parseMarkdown('**粗** *斜* ~~刪~~ `code` [網站](https://a.b "標題")');
    expect(doc.content[0]).toEqual(
      p(
        text("粗", [{ type: "bold" }]),
        text(" "),
        text("斜", [{ type: "italic" }]),
        text(" "),
        text("刪", [{ type: "strike" }]),
        text(" "),
        text("code", [{ type: "code" }]),
        text(" "),
        text("網站", [{ type: "link", attrs: { href: "https://a.b", title: "標題" } }]),
      ),
    );
  });

  it("標記可以巢狀", () => {
    expect(parseMarkdown("***both***").content[0]).toEqual(
      p(text("both", [{ type: "italic" }, { type: "bold" }])),
    );
  });

  it("項目符號與有序清單（含起始編號）", () => {
    const doc = parseMarkdown("- a\n- b\n\n3. x\n4. y");
    expect((doc.content[0] as { type: string }).type).toBe("bulletList");
    expect((doc.content[1] as { type: string; attrs: { start: number } }).attrs.start).toBe(3);
  });

  it("巢狀清單", () => {
    const doc = parseMarkdown("- a\n  - b");
    const item = ((doc.content[0] as { content: unknown[] }).content[0] as { content: unknown[] });
    expect(item.content).toHaveLength(2);
    expect((item.content[1] as { type: string }).type).toBe("bulletList");
  });

  it("引用區塊", () => {
    expect((parseMarkdown("> 引言").content[0] as { type: string }).type).toBe("blockquote");
  });

  it("程式碼區塊：語言、標籤、標題", () => {
    const doc = parseMarkdown('```python {#lst:one caption="排序"}\nprint(1)\n```');
    expect(doc.content[0]).toEqual({
      type: "codeBlock",
      attrs: { language: "python", label: "lst:one", caption: "排序" },
      content: [text("print(1)")],
    });
  });

  it("沒有語言與屬性的程式碼區塊", () => {
    const doc = parseMarkdown("```\nplain\n```");
    expect((doc.content[0] as { attrs: unknown }).attrs).toEqual({
      language: null,
      label: null,
      caption: null,
    });
  });

  it("換行：軟換行變空白，硬換行保留", () => {
    expect(parseMarkdown("a\nb").content[0]).toEqual(p(text("a b")));
    expect(parseMarkdown("a\\\nb").content[0]).toEqual(p(text("a"), { type: "hardBreak" }, text("b")));
  });

  it("原始 HTML 當作文字，不會被解析", () => {
    expect(parseMarkdown("<b>x</b>").content[0]).toEqual(p(text("<b>x</b>")));
  });
});

describe("serializeMarkdown", () => {
  it("段落與標題，區塊之間一個空行、結尾一個換行", () => {
    const doc = {
      type: "doc" as const,
      content: [
        { type: "heading", attrs: { level: 1, label: "cha:intro" }, content: [text("緒論")] },
        p(text("內文")),
      ],
    };
    expect(serializeMarkdown(doc)).toBe("# 緒論 {#cha:intro}\n\n內文\n");
  });

  it("空文件輸出空字串", () => {
    expect(serializeMarkdown({ type: "doc", content: [{ type: "paragraph" }] })).toBe("");
  });

  it("標記的規範形式", () => {
    const doc = {
      type: "doc" as const,
      content: [
        p(
          text("粗", [{ type: "bold" }]),
          text(" "),
          text("斜", [{ type: "italic" }]),
          text(" "),
          text("刪", [{ type: "strike" }]),
          text(" "),
          text("code", [{ type: "code" }]),
        ),
      ],
    };
    expect(serializeMarkdown(doc)).toBe("**粗** *斜* ~~刪~~ `code`\n");
  });

  it("清單使用 - 與逐項遞增的編號", () => {
    const item = (s: string) => ({ type: "listItem", content: [p(text(s))] });
    const doc = {
      type: "doc" as const,
      content: [
        { type: "bulletList", content: [item("a"), item("b")] },
        { type: "orderedList", attrs: { start: 3 }, content: [item("x"), item("y")] },
      ],
    };
    expect(serializeMarkdown(doc)).toBe("- a\n- b\n\n3. x\n4. y\n");
  });

  it("程式碼區塊含屬性；內容含三個反引號時圍欄加長", () => {
    const doc = {
      type: "doc" as const,
      content: [
        {
          type: "codeBlock",
          attrs: { language: "md", label: "lst:one", caption: "a b" },
          content: [text("```x```")],
        },
      ],
    };
    expect(serializeMarkdown(doc)).toBe('````md {#lst:one caption="a b"}\n```x```\n````\n');
  });

  it("文字中的特殊字元會被跳脫", () => {
    const doc = { type: "doc" as const, content: [p(text("1 * 2 _x_ [a] # `b`"))] };
    expect(serializeMarkdown(doc)).toBe("1 \\* 2 \\_x\\_ \\[a\\] # \\`b\\`\n");
  });
});

describe("往返", () => {
  const canonical = [
    "# 緒論 {#cha:intro}\n\n內文 **粗** *斜*\n",
    "- a\n- b\n  - c\n\n1. x\n2. y\n",
    "> 引言\n>\n> 第二段\n",
    '```python {#lst:one caption=排序}\nprint(1)\n```\n',
    "a\\\nb\n",
    "[網站](https://a.b)\n",
  ];

  it.each(canonical)("規範形式不變：%j", (markdown) => {
    expect(serializeMarkdown(parseMarkdown(markdown))).toBe(markdown);
  });

  it("有多段的清單項目使用鬆散格式，往返不會把兩段併成一段", () => {
    const loose = "- a\n\n  b\n- c\n";
    const doc = parseMarkdown(loose);
    const item = (doc.content[0] as { content: Array<{ content: unknown[] }> }).content[0];
    expect(item?.content).toHaveLength(2);
    expect(serializeMarkdown(doc)).toBe("- a\n\n  b\n\n- c\n");
    expect(parseMarkdown(serializeMarkdown(doc))).toEqual(doc);
  });

  it("非規範的輸入先被規範化，再解析一次結果相同（冪等）", () => {
    const messy = "Title\n=====\n\n* a\n* b\n\n\n\n__粗__ and _斜_\n";
    const once = serializeMarkdown(parseMarkdown(messy));
    expect(once).toBe("# Title\n\n- a\n- b\n\n**粗** and *斜*\n");
    expect(serializeMarkdown(parseMarkdown(once))).toBe(once);
    expect(parseMarkdown(once)).toEqual(parseMarkdown(messy));
  });
});

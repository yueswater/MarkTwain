import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { parseMarkdown } from "./parse";
import { serializeMarkdown } from "./serialize";

const text = (value: string) => ({ type: "text", text: value });
const p = (...content: unknown[]) => ({ type: "paragraph", content });
const doc = (...content: unknown[]) => ({ type: "doc" as const, content });

type Align = "left" | "center" | "right" | null;
const cell = (value: string, align: Align = null, header = false) => ({
  type: header ? "tableHeader" : "tableCell",
  attrs: { align, valign: null, colspan: 1, rowspan: 1, colwidth: null },
  content: [value === "" ? { type: "paragraph" } : p(text(value))],
});
const row = (...cells: unknown[]) => ({ type: "tableRow", attrs: { height: null }, content: cells });
const table = (
  rows: unknown[],
  attrs: Partial<{ label: string | null; caption: string; notes: string; style: string; widths: string }> = {},
) => ({
  type: "table",
  attrs: { label: null, caption: "", notes: "", style: "three-line", widths: "", borders: "", width: null, size: null, placement: null, ...attrs },
  content: rows,
});

describe("表格：解析", () => {
  it("第一列是表頭，其餘是內容", () => {
    expect(parseMarkdown("| 甲 | 乙 |\n| --- | --- |\n| 1 | 2 |").content[0]).toEqual(
      table([row(cell("甲", null, true), cell("乙", null, true)), row(cell("1"), cell("2"))]),
    );
  });

  it("欄位對齊", () => {
    expect(parseMarkdown("| a | b | c |\n| :--- | :---: | ---: |\n| 1 | 2 | 3 |").content[0]).toEqual(
      table([
        row(cell("a", "left", true), cell("b", "center", true), cell("c", "right", true)),
        row(cell("1", "left"), cell("2", "center"), cell("3", "right")),
      ]),
    );
  });

  it("標題行：: 標題 {#標籤 notes=…}", () => {
    expect(
      parseMarkdown('| a |\n| --- |\n| 1 |\n\n: 實驗結果 {#tbl:one notes="資料來源：教務處"}').content,
    ).toEqual([
      table([row(cell("a", null, true)), row(cell("1"))], {
        label: "tbl:one",
        caption: "實驗結果",
        notes: "資料來源：教務處",
      }),
    ]);
  });

  it("只有標題、沒有屬性", () => {
    expect(parseMarkdown("| a |\n| --- |\n\n: 只有標題").content[0]).toEqual(
      table([row(cell("a", null, true))], { caption: "只有標題" }),
    );
  });

  it("不以 `: ` 開頭的下一段仍是一般段落", () => {
    expect(parseMarkdown("| a |\n| --- |\n\n後面的段落").content).toEqual([
      table([row(cell("a", null, true))]),
      p(text("後面的段落")),
    ]);
  });

  it("儲存格內的行內標記與跳脫的 |", () => {
    const parsed = parseMarkdown("| **粗** \\| x |\n| --- |").content[0] as {
      content: Array<{ content: Array<{ content: unknown[] }> }>;
    };
    expect(parsed.content[0]?.content[0]?.content[0]).toEqual(
      p({ type: "text", text: "粗", marks: [{ type: "bold" }] }, text(" | x")),
    );
  });

  it("儲存格比表頭少時補空的儲存格", () => {
    const parsed = parseMarkdown("| a | b |\n| --- | --- |\n| 1 |").content[0] as {
      content: Array<{ content: unknown[] }>;
    };
    expect(parsed.content[1]?.content).toHaveLength(2);
  });
});

describe("表格：序列化", () => {
  it("規範形式", () => {
    expect(
      serializeMarkdown(doc(table([row(cell("甲", null, true), cell("乙", null, true)), row(cell("1"), cell("2"))]))),
    ).toBe("| 甲 | 乙 |\n| --- | --- |\n| 1 | 2 |\n");
  });

  it("對齊由第一列的儲存格決定", () => {
    expect(
      serializeMarkdown(
        doc(table([row(cell("a", "left", true), cell("b", "center", true), cell("c", "right", true))])),
      ),
    ).toBe("| a | b | c |\n| :--- | :---: | ---: |\n");
  });

  it("標題、標籤與附註接在表格後面，空一行", () => {
    expect(
      serializeMarkdown(
        doc(table([row(cell("a", null, true)), row(cell("1"))], { label: "tbl:one", caption: "實驗結果", notes: "資料來源" })),
      ),
    ).toBe("| a |\n| --- |\n| 1 |\n\n: 實驗結果 {#tbl:one notes=資料來源}\n");
  });

  it("沒有標題但有標籤時也輸出標題行", () => {
    expect(serializeMarkdown(doc(table([row(cell("a", null, true))], { label: "tbl:x" })))).toBe(
      "| a |\n| --- |\n\n: {#tbl:x}\n",
    );
  });

  it("文字裡的 | 跳脫，空儲存格與列的長度補齊", () => {
    expect(
      serializeMarkdown(doc(table([row(cell("a|b", null, true), cell("", null, true)), row(cell("x"))]))),
    ).toBe("| a\\|b |  |\n| --- | --- |\n| x |  |\n");
  });

  it("儲存格裡的硬換行變成空白", () => {
    const withBreak = {
      type: "tableCell",
      attrs: { align: null, valign: null, colspan: 1, rowspan: 1, colwidth: null },
      content: [p(text("甲"), { type: "hardBreak" }, text("乙"))],
    };
    expect(serializeMarkdown(doc(table([row(withBreak)])))).toBe("| 甲 乙 |\n| --- |\n");
  });

  it("儲存格裡行內公式的 | 改寫成 \\vert{}", () => {
    const math = {
      type: "tableCell",
      attrs: { align: null, valign: null, colspan: 1, rowspan: 1, colwidth: null },
      content: [p({ type: "inlineMath", attrs: { latex: "|x|" } })],
    };
    expect(serializeMarkdown(doc(table([row(math)])))).toBe("| $\\vert{}x\\vert{}$ |\n| --- |\n");
  });
});

describe("往返", () => {
  it.each([
    "| 甲 | 乙 |\n| --- | --- |\n| 1 | 2 |\n",
    "| a | b |\n| :--- | ---: |\n| 1 | 2 |\n| 3 | 4 |\n\n: 實驗結果 {#tbl:one notes=資料來源}\n",
    "前\n\n| a |\n| --- |\n\n: 標題\n\n後\n",
    "- 清單\n\n  | a |\n  | --- |\n  | 1 |\n",
  ])("規範形式不變：%j", (markdown) => {
    expect(serializeMarkdown(parseMarkdown(markdown))).toBe(markdown);
  });

  it("任何儲存格文字、對齊、標題都能原樣往返", () => {
    const content = fc
      .string({ unit: fc.constantFrom(..."ab 中文|*_[]$#-:.\\"), minLength: 1, maxLength: 8 })
      .filter((s) => s === s.trim());
    const align = fc.constantFrom<Align>(null, "left", "center", "right");
    const label = fc.constantFrom(null, "tbl:a");
    const caption = fc.string({ unit: fc.constantFrom(..."ab 中文"), minLength: 0, maxLength: 6 }).map((s) => s.trim());

    fc.assert(
      fc.property(
        fc.array(align, { minLength: 1, maxLength: 3 }),
        fc.integer({ min: 0, max: 2 }),
        fc.array(content, { minLength: 9, maxLength: 9 }),
        label,
        caption,
        (aligns, bodyRows, words, tableLabel, tableCaption) => {
          let n = 0;
          const makeRow = (header: boolean) =>
            row(...aligns.map((a) => cell(words[n++ % words.length] ?? "x", a, header)));
          const rows = [makeRow(true), ...Array.from({ length: bodyRows }, () => makeRow(false))];
          const input = doc(table(rows, { label: tableLabel, caption: tableCaption }));
          expect(parseMarkdown(serializeMarkdown(input))).toEqual(input);
          return true;
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe("tables with style, widths, heights and merged cells", () => {
  const sample = [
    "| a | b | c |",
    "| :--- | :---: | ---: |",
    "| 1 |  |  |",
    "| 2 | 3 | 4 |",
    "| 5 | 6 | 7 |",
    "",
    ': Result {#tbl:r cells="2.1:colspan=3;3.2:align=right,rowspan=2" heights="1:24pt,3:2em" style=grid widths="20%,auto,30%"}',
    "",
  ].join("\n");

  it("parses merges, drops the covered cells and keeps the attributes", () => {
    const parsed = parseMarkdown(sample).content[0] as {
      attrs: Record<string, unknown>;
      content: { attrs: { height: string | null }; content: { attrs: Record<string, unknown> }[] }[];
    };
    expect(parsed.attrs).toMatchObject({ style: "grid", widths: "20%,auto,30%", label: "tbl:r", caption: "Result" });
    expect(parsed.content.map((r) => r.content.length)).toEqual([3, 1, 3, 2]);
    expect(parsed.content[1]?.content[0]?.attrs).toMatchObject({ colspan: 3, rowspan: 1, align: "left" });
    expect(parsed.content[2]?.content[1]?.attrs).toMatchObject({ rowspan: 2, align: "right", colspan: 1 });
    expect(parsed.content.map((r) => r.attrs.height)).toEqual(["24pt", null, "2em", null]);
    expect(parsed.content[0]?.content[0]?.attrs.colwidth).toEqual([140]);
    expect(parsed.content[0]?.content[1]?.attrs.colwidth).toBeNull();
  });

  it("serializes to canonical text that parses to the same table", () => {
    const canonical = serializeMarkdown(parseMarkdown(sample));
    expect(canonical).toBe(
      [
        "| a | b | c |",
        "| :--- | :---: | ---: |",
        "| 1 |  |  |",
        "| 2 | 3 | 4 |",
        "| 5 |  | 7 |",
        "",
        ": Result {#tbl:r cells=2.1:colspan=3;3.2:rowspan=2,align=right heights=1:24pt,3:2em style=grid widths=20%,auto,30%}",
        "",
      ].join("\n"),
    );
    expect(parseMarkdown(canonical)).toEqual(parseMarkdown(sample));
    expect(serializeMarkdown(parseMarkdown(canonical))).toBe(canonical);
  });

  it("per cell vertical alignment survives", () => {
    const md = "| a | b |\n| --- | --- |\n| 1 | 2 |\n\n: {cells=2.2:valign=bottom}\n";
    expect(serializeMarkdown(parseMarkdown(md))).toBe(md);
  });

  it("ignores spans that do not fit the table and invalid lengths", () => {
    const md = '| a | b |\n| --- | --- |\n| 1 | 2 |\n\n: {cells="9.9:colspan=2" heights="1:evil" widths="x,y"}\n';
    const parsed = parseMarkdown(md).content[0] as { attrs: { widths: string }; content: unknown[] };
    expect(parsed.content).toHaveLength(2);
    expect(parsed.attrs.widths).toBe("");
    expect(serializeMarkdown(parseMarkdown(md))).toBe("| a | b |\n| --- | --- |\n| 1 | 2 |\n");
  });
});

describe("spans are clamped to the table", () => {
  it("a rowspan or colspan past the edge is shortened", () => {
    const md = "| a | b |\n| --- | --- |\n| 1 | 2 |\n\n: {cells=2.1:colspan=5,rowspan=4}\n";
    const parsed = parseMarkdown(md).content[0] as { content: { content: { attrs: Record<string, unknown> }[] }[] };
    expect(parsed.content[1]?.content[0]?.attrs).toMatchObject({ colspan: 2, rowspan: 1 });
    expect(parsed.content).toHaveLength(2);
  });
});

describe("borders", () => {
  it("lines of the caption line are kept in order, a bad entry is dropped, and a table without them is unchanged", () => {
    const md = "| a | b |\n|---|---|\n| 1 | 2 |\n\n: 表 {#tbl:t borders=\"h-1.*=2.25;v1.0=0.5/dashed;x9.9=1\"}\n";
    const parsed = parseMarkdown(md).content?.[0] as { attrs: { borders: string } };
    expect(parsed.attrs.borders).toBe("h-1.*=2.25;v1.0=0.5/dashed");
    const out = serializeMarkdown(parseMarkdown(md));
    expect(out).toContain("borders=h-1.*=2.25;v1.0=0.5/dashed");
    expect(serializeMarkdown(parseMarkdown(out))).toBe(out);
    expect(serializeMarkdown(parseMarkdown("| a |\n|---|\n| 1 |\n\n: 表\n"))).not.toContain("borders");
  });
});

describe("width and size of a whole table", () => {
  it("are kept as shares and written back, 100% and nonsense are left out", () => {
    const md = (props: string) => `| a |\n|---|\n| 1 |\n\n: 表 {#tbl:t ${props}}\n`;
    const read = (props: string) => (parseMarkdown(md(props)).content?.[0] as { attrs: { width: string | null; size: string | null } }).attrs;
    expect(read("width=80% size=90%")).toEqual(expect.objectContaining({ width: "80%", size: "90%" }));
    expect(read("width=100% size=30%")).toEqual(expect.objectContaining({ width: null, size: null }));
    expect(read("width=wide")).toEqual(expect.objectContaining({ width: null }));
    const out = serializeMarkdown(parseMarkdown(md("width=60% size=80%")));
    expect(out).toContain("width=60%");
    expect(out).toContain("size=80%");
    expect(serializeMarkdown(parseMarkdown(out))).toBe(out);
    expect(serializeMarkdown(parseMarkdown("| a |\n|---|\n| 1 |\n\n: 表\n"))).not.toContain("width");
  });
});

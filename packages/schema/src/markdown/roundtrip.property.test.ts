import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { parseMarkdown, type DocJson } from "./parse";
import { serializeMarkdown } from "./serialize";

type Mark = { type: string; attrs?: Record<string, unknown> };
type TextNode = { type: "text"; text: string; marks?: Mark[] };

// 會讓 Markdown 誤判的字元都放進來，加上一般的字
const RISKY = [..."*_`[]()<>#-+!~\\|$@{}:.&\"'/=", "1", "2", "a", "B", "中", "文", " "];

/**
 * 標記（粗體、斜體…）的內容要以字或數字開頭與結尾。CommonMark 的「左側包夾」規則
 * 讓 `說**「重點」**` 這種「標記緊貼文字、內容以標點開頭」的寫法無法成立，
 * 這是標準 Markdown 本身的限制（見 issue：CJK 標點與強調）。
 */
const markedText = fc
  .string({ unit: fc.constantFrom(...RISKY), minLength: 0, maxLength: 12 })
  .map((inner) => `a${inner}b`);

const safeText = fc
  .string({ unit: fc.constantFrom(...RISKY), minLength: 1, maxLength: 24 })
  .filter((s) => s === s.trim());

function paragraph(...content: TextNode[]) {
  return { type: "paragraph", content };
}

function doc(...content: unknown[]): DocJson {
  return { type: "doc", content };
}

/** 相鄰且標記相同的文字節點合併，與解析器的輸出一致。 */
function normalize(json: DocJson): DocJson {
  const walk = (node: any): any => {
    if (!node.content) return node;
    const merged: any[] = [];
    for (const child of node.content.map(walk)) {
      const last = merged[merged.length - 1];
      if (
        last?.type === "text" &&
        child.type === "text" &&
        JSON.stringify(last.marks ?? []) === JSON.stringify(child.marks ?? [])
      ) {
        last.text += child.text;
      } else {
        merged.push({ ...child });
      }
    }
    return { ...node, content: merged };
  };
  return walk(json);
}

/** 序列化再解析，結果必須與原本相同。失敗時 expect 會丟出例外，fast-check 會縮小反例。 */
function roundTrips(input: DocJson): boolean {
  const output = parseMarkdown(serializeMarkdown(input));
  expect(normalize(output)).toEqual(normalize(input));
  return true;
}

describe("往返的屬性測試", () => {
  it("任何純文字段落都能原樣往返", () => {
    fc.assert(
      fc.property(safeText, (text) => roundTrips(doc(paragraph({ type: "text", text }))))
      , { numRuns: 1000 });
  });

  it("任何純文字標題都能原樣往返", () => {
    fc.assert(
      fc.property(safeText, fc.integer({ min: 1, max: 6 }), (text, level) =>
        roundTrips(doc({ type: "heading", attrs: { level, label: null }, content: [{ type: "text", text }] })),
      ),
      { numRuns: 500 },
    );
  });

  it("任何文字放在引用區塊與清單裡都能原樣往返", () => {
    fc.assert(
      fc.property(safeText, (text) => {
        const para = paragraph({ type: "text", text });
        return (
          roundTrips(doc({ type: "blockquote", content: [para] })) &&
          roundTrips(doc({ type: "bulletList", content: [{ type: "listItem", content: [para] }] }))
        );
      }),
      { numRuns: 500 },
    );
  });

  it("任何文字用粗體、斜體、刪除線或連結標記後都能原樣往返", () => {
    const markSets: Mark[][] = [
      [{ type: "bold" }],
      [{ type: "italic" }],
      [{ type: "strike" }],
      [{ type: "italic" }, { type: "bold" }],
      [{ type: "link", attrs: { href: "https://example.com/a", title: null } }],
    ];
    fc.assert(
      fc.property(markedText, fc.constantFrom(...markSets), (text, marks) =>
        roundTrips(doc(paragraph({ type: "text", text }, { type: "text", text: " 後面", marks: undefined } as TextNode, { type: "text", text, marks }))),
      ),
      { numRuns: 500 },
    );
  });

  it("任何文字在行內程式碼裡都能原樣往返", () => {
    fc.assert(
      fc.property(safeText, (text) =>
        roundTrips(doc(paragraph({ type: "text", text }, { type: "text", text: " x " }, { type: "text", text, marks: [{ type: "code" }] }))),
      ),
      { numRuns: 500 },
    );
  });

  it("任何內容都能放進程式碼區塊並原樣往返", () => {
    const code = fc.string({ unit: fc.constantFrom(...RISKY, "\n"), minLength: 1, maxLength: 40 }).filter((s) => s.trim() !== "" && !s.endsWith("\n") && !s.startsWith("\n"));
    fc.assert(
      fc.property(code, (text) =>
        roundTrips(doc({ type: "codeBlock", attrs: { language: null, label: null, caption: null }, content: [{ type: "text", text }] })),
      ),
      { numRuns: 500 },
    );
  });
});

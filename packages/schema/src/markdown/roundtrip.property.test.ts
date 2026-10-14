import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { parseMarkdown, type DocJson } from "./parse";
import { serializeMarkdown } from "./serialize";

type Mark = { type: string; attrs?: Record<string, unknown> };
type TextNode = { type: "text"; text: string; marks?: Mark[] };

// Put in every character that Markdown may misjudge, plus ordinary characters
const RISKY = [..."*_`[]()<>#-+!~\\|$@{}:.&\"'/=", "1", "2", "a", "B", "中", "文", " "];

/**
 * Content of a mark such as bold or italic should start and end with a letter or digit. The left flanking rule of CommonMark
 * makes bold that touches text and starts with CJK punctuation impossible, where the mark touches text and the content starts with punctuation,
 * a limit of standard Markdown itself, see the issue about CJK punctuation and emphasis.
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

/** Adjacent text nodes with the same marks are merged, matching the output of the parser. */
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

/** Serializing and parsing again must give the same result. On failure expect throws and fast-check shrinks the counterexample. */
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

  it("標記的內容以中文標點開頭或結尾、緊貼前後文字也能原樣往返（#71）", () => {
    const cjk = fc.constantFrom(..."說明文字中「」『』（）［］，。、；：！？…—a1");
    const edgeText = fc
      .string({ unit: cjk, minLength: 1, maxLength: 10 })
      .filter((s) => s === s.trim());
    const markSets: Mark[][] = [[{ type: "bold" }], [{ type: "italic" }], [{ type: "strike" }]];
    // A Latin letter right before, such as a**「x」**, still does not work, markdown-it-cjk-friendly relaxes only the CJK neighbours
    fc.assert(
      fc.property(edgeText, fc.constantFrom(...markSets), fc.constantFrom("說", "，", "「"), (text, marks, before) =>
        roundTrips(
          doc(
            paragraph(
              { type: "text", text: before },
              { type: "text", text, marks },
              { type: "text", text: "後" },
            ),
          ),
        ),
      ),
      { numRuns: 2000 },
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

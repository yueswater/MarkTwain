import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { parseMarkdown, type DocJson } from "./parse";
import { serializeMarkdown } from "./serialize";

// Combines every syntax of the dialect at random into documents, serializing and parsing must give the same document,
// and serializing again must give the exact same text, which is idempotence.

type Json = Record<string, any>;

const word = fc
  .string({ unit: fc.constantFrom(..."ab中文 *_[]$#-:.\\|@{}<>&!~`"), minLength: 1, maxLength: 8 })
  .filter((s) => s === s.trim());
const boldWord = fc.string({ unit: fc.constantFrom(..."ab中文"), minLength: 1, maxLength: 5 });
const key = fc.string({ unit: fc.constantFrom(..."abc019_"), minLength: 1, maxLength: 6 }).filter((s) => /^[A-Za-z0-9_]/.test(s));

const text = (value: string, marks?: Json[]): Json => ({ type: "text", text: value, ...(marks ? { marks } : {}) });

const inlineItem: fc.Arbitrary<Json> = fc.oneof(
  word.map((w) => text(w)),
  boldWord.map((w) => text(`a${w}b`, [{ type: "bold" }])),
  boldWord.map((w) => text(`a${w}b`, [{ type: "italic" }])),
  word.map((w) => text(w, [{ type: "code" }])),
  fc.constantFrom("x", "a_1", "\\alpha", "|x|").map((latex) => ({ type: "inlineMath", attrs: { latex } })),
  fc.tuple(fc.array(key, { minLength: 1, maxLength: 2 }), fc.constantFrom("paren", "year")).map(([keys, form]) => ({
    type: "citation",
    attrs: { keys, form },
  })),
  fc.tuple(fc.constantFrom("fig", "tbl", "eq", "sec"), key).map(([k, n]) => ({ type: "crossRef", attrs: { label: `${k}:${n}` } })),
  boldWord.map((w) => ({ type: "footnote", attrs: { text: `註 ${w}` } })),
);

/** Inline content, items are separated by space text so neighbouring characters do not affect each other. */
const inline = fc.array(inlineItem, { minLength: 1, maxLength: 4 }).map((items) =>
  items.flatMap((item, i) => (i === 0 ? [item] : [text(" "), item])),
);

const paragraph = inline.map((content): Json => ({ type: "paragraph", content }));

const heading = fc.tuple(fc.integer({ min: 1, max: 4 }), word, fc.constantFrom(null, "sec:a", "cha:b")).map(
  ([level, w, label]): Json => ({ type: "heading", attrs: { level, label }, content: [text(w)] }),
);

const listItem = paragraph.map((p): Json => ({ type: "listItem", content: [p] }));
const bulletList = fc.array(listItem, { minLength: 1, maxLength: 3 }).map((items): Json => ({ type: "bulletList", content: items }));
const orderedList = fc
  .tuple(fc.integer({ min: 1, max: 5 }), fc.array(listItem, { minLength: 1, maxLength: 3 }))
  .map(([start, items]): Json => ({ type: "orderedList", attrs: { start }, content: items }));

const blockquote = paragraph.map((p): Json => ({ type: "blockquote", content: [p] }));

const codeBlock = fc
  .tuple(fc.constantFrom(null, "python"), fc.constantFrom(null, "lst:a"), fc.string({ unit: fc.constantFrom(..."ab `~:{}\n"), minLength: 1, maxLength: 20 }))
  .filter(([, , body]) => body.trim() !== "" && !body.startsWith("\n") && !body.endsWith("\n"))
  .map(([language, label, body]): Json => ({
    type: "codeBlock",
    attrs: { language, label, caption: null },
    content: [text(body)],
  }));

const blockMath = fc.tuple(fc.constantFrom("E=mc^2", "\\int_0^1 x\\,dx", "a\nb"), fc.constantFrom(null, "eq:a")).map(
  ([latex, label]): Json => ({ type: "blockMath", attrs: { latex, label } }),
);

const figure = fc
  .tuple(fc.constantFrom("a.png", "figures/圖 一.png"), boldWord, fc.constantFrom(null, "fig:a"), fc.constantFrom(null, "60%"))
  .map(([src, caption, label, width]): Json => ({ type: "figure", attrs: { src, caption, label, width } }));

const cell = (header: boolean) =>
  word.map((w): Json => ({
    type: header ? "tableHeader" : "tableCell",
    attrs: { align: null, valign: null, colspan: 1, rowspan: 1, colwidth: null },
    content: [{ type: "paragraph", content: [text(w)] }],
  }));
const table = fc
  .tuple(fc.integer({ min: 1, max: 3 }), fc.integer({ min: 0, max: 2 }))
  .chain(([columns, bodyRows]) =>
    fc.tuple(
      fc.array(cell(true), { minLength: columns, maxLength: columns }),
      fc.array(fc.array(cell(false), { minLength: columns, maxLength: columns }), { minLength: bodyRows, maxLength: bodyRows }),
      fc.constantFrom(null, "tbl:a"),
      boldWord,
    ),
  )
  .map(([head, body, label, caption]): Json => ({
    type: "table",
    attrs: { label, caption, notes: "", style: "three-line", widths: "" },
    content: [{ type: "tableRow", attrs: { height: null }, content: head }, ...body.map((cells) => ({ type: "tableRow", attrs: { height: null }, content: cells }))],
  }));

const definitionList = fc
  .array(fc.tuple(word, word), { minLength: 1, maxLength: 2 })
  .map((pairs): Json => ({
    type: "definitionList",
    content: pairs.flatMap(([t, d]) => [
      { type: "definitionTerm", content: [text(t)] },
      { type: "definitionDescription", content: [{ type: "paragraph", content: [text(d)] }] },
    ]),
  }));

const div = fc.tuple(fc.constantFrom("abstract-zh", "abstract-en", "note"), paragraph).map(
  ([cls, p]): Json => ({ type: "div", attrs: { id: null, classes: [cls], props: {} }, content: [p] }),
);

const block = fc.oneof(
  { weight: 4, arbitrary: paragraph },
  { weight: 2, arbitrary: heading },
  bulletList,
  orderedList,
  blockquote,
  codeBlock,
  blockMath,
  figure,
  table,
  definitionList,
  div,
);

/** Adjacent text nodes with the same marks are merged, matching the output of the parser. */
function normalize(node: Json): Json {
  if (!node.content) return node;
  const merged: Json[] = [];
  for (const child of node.content.map(normalize)) {
    const last = merged[merged.length - 1];
    if (last?.type === "text" && child.type === "text" && JSON.stringify(last.marks ?? []) === JSON.stringify(child.marks ?? [])) {
      last.text += child.text;
    } else {
      merged.push({ ...child });
    }
  }
  return { ...node, content: merged };
}

/** Adjacent blocks of the same kind merge in Markdown, such as two consecutive lists, so separate them with an empty paragraph first. */
function separate(blocks: Json[]): Json[] {
  const merging = new Set(["bulletList", "orderedList", "definitionList", "blockquote", "table"]);
  const out: Json[] = [];
  for (const b of blocks) {
    const last = out[out.length - 1];
    if (last && merging.has(b.type) && last.type === b.type) out.push({ type: "paragraph", content: [text("分隔")] });
    out.push(b);
  }
  return out;
}

describe("混合文件的往返", () => {
  it("隨機組合所有語法：往返原樣、再序列化結果相同", () => {
    fc.assert(
      fc.property(fc.array(block, { minLength: 1, maxLength: 6 }), (blocks) => {
        const input: DocJson = { type: "doc", content: separate(blocks) };
        const markdown = serializeMarkdown(input);
        const parsed = parseMarkdown(markdown);
        expect(normalize(parsed as Json)).toEqual(normalize(input as Json));
        expect(serializeMarkdown(parsed)).toBe(markdown);
        return true;
      }),
      // Usually 400 runs, for a deep check use FC_NUM_RUNS=10000 pnpm test -- document.property
      { numRuns: Number(process.env.FC_NUM_RUNS ?? 400) },
    );
  });
});

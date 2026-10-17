import { describe, expect, it } from "@jest/globals";
import { parseMarkdown, type DocJson } from "./parse";
import { serializeMarkdown } from "./serialize";

type Inline = Record<string, unknown>;

const text = (value: string, marks?: unknown[]): Inline => ({ type: "text", text: value, ...(marks ? { marks } : {}) });

/** Every kind of inline content, a hard break comes last in the tests of its own since a break at the end of a paragraph is dropped. */
const INLINE: Record<string, Inline> = {
  math: { type: "inlineMath", attrs: { latex: "x^2" } },
  ref: { type: "crossRef", attrs: { label: "fig:a" } },
  paren: { type: "citation", attrs: { keys: ["wang2020"], form: "paren" } },
  prose: { type: "citation", attrs: { keys: ["wang2020"], form: "prose" } },
  year: { type: "citation", attrs: { keys: ["wang2020"], form: "year" } },
  author: { type: "citation", attrs: { keys: ["wang2020"], form: "author" } },
  footnote: { type: "footnote", attrs: { text: "note" } },
  code: text("c", [{ type: "code" }]),
  bold: text("b", [{ type: "bold" }]),
  italic: text("i", [{ type: "italic" }]),
  link: text("l", [{ type: "link", attrs: { href: "https://example.com", title: null } }]),
  plain: text("t"),
};

/** Adjacent plain pieces of the same marks are one piece, and the order of the keys does not matter. */
function canonical(doc: DocJson): string {
  const sort = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(sort)
      : value && typeof value === "object"
        ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sort((value as Record<string, unknown>)[key])]))
        : value;
  const content = ((doc.content[0] as { content?: Inline[] }).content ?? []).reduce<Inline[]>((merged, node) => {
    const last = merged.at(-1);
    if (last?.type === "text" && node.type === "text" && JSON.stringify(last.marks ?? []) === JSON.stringify(node.marks ?? [])) {
      last.text = String(last.text) + String(node.text);
    } else merged.push({ ...node });
    return merged;
  }, []);
  return JSON.stringify(sort(content));
}

function roundTrip(content: Inline[]): { before: string; after: string; markdown: string } {
  const doc = { type: "doc", content: [{ type: "paragraph", content }] } as DocJson;
  const markdown = serializeMarkdown(doc);
  return { before: canonical(doc), after: canonical(parseMarkdown(markdown)), markdown };
}

describe("inline content that touches other inline content", () => {
  const names = Object.keys(INLINE);

  it.each(names.flatMap((first) => names.map((second) => [first, second])))("%s followed by %s keeps both", (first, second) => {
    const { before, after, markdown } = roundTrip([INLINE[first]!, INLINE[second]!]);
    expect({ markdown, after }).toEqual({ markdown, after: before });
  });

  it.each(names.flatMap((first) => names.map((second) => [first, second])))("%s and %s with a word on each side", (first, second) => {
    const { before, after, markdown } = roundTrip([text("a"), INLINE[first]!, INLINE[second]!, text("z")]);
    expect({ markdown, after }).toEqual({ markdown, after: before });
  });

  it("a hard break between two references keeps both", () => {
    const { before, after } = roundTrip([INLINE.ref!, { type: "hardBreak" }, INLINE.ref!]);
    expect(after).toBe(before);
  });
});

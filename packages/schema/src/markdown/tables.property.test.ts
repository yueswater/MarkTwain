import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import { parseMarkdown } from "./parse";
import { serializeMarkdown } from "./serialize";

type Align = "left" | "center" | "right" | null;
type Span = { r: number; c: number; colspan: number; rowspan: number; align: Align; valign: string | null };

const align = fc.constantFrom<Align>("left", "center", "right");
const valign = fc.constantFrom<string | null>(null, "top", "middle", "bottom");

/** A random table layout, merged cells never overlap and the first row stays unmerged. */
const layout = fc
  .record({
    rows: fc.integer({ min: 2, max: 5 }),
    cols: fc.integer({ min: 1, max: 4 }),
    seed: fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 40, maxLength: 40 }),
    columnAlign: fc.array(fc.option(align, { nil: null }), { minLength: 4, maxLength: 4 }),
    style: fc.constantFrom("three-line", "grid"),
    widths: fc.constantFrom("", "20%,30%,50%,auto", "10cm,auto,auto,auto"),
    heights: fc.array(fc.option(fc.constantFrom("24pt", "2em", "1cm"), { nil: null }), { minLength: 5, maxLength: 5 }),
    // Braces, quotes and backslashes in a caption or in notes sit next to the block of attributes, and none of them may change what is read back
    caption: fc.constantFrom("", "Caption", "Cap {x}", 'Cap "q" \\ end', "混淆矩陣 (Confusion & 100%)"),
    notes: fc.constantFrom("", "資料來源：A_b #1 {x}", 'say "hi" \\ done}', "a}b{c", "{", "}", '"', "\\"),
  })
  .map((input) => {
    let k = 0;
    const next = (n: number) => input.seed[k++ % input.seed.length]! % n;
    const taken = new Set<string>();
    const spans: Span[] = [];
    for (let r = 1; r <= input.rows; r += 1) {
      for (let c = 1; c <= input.cols; c += 1) {
        if (taken.has(`${r}.${c}`)) continue;
        let colspan = 1;
        let rowspan = 1;
        if (r > 1) {
          while (c + colspan <= input.cols && colspan < 1 + next(3) && !taken.has(`${r}.${c + colspan}`)) colspan += 1;
          while (r + rowspan <= input.rows && rowspan < 1 + next(3)) {
            const free = Array.from({ length: colspan }, (_, d) => `${r + rowspan}.${c + d}`).every((p) => !taken.has(p));
            if (!free) break;
            rowspan += 1;
          }
        }
        for (let dr = 0; dr < rowspan; dr += 1) for (let dc = 0; dc < colspan; dc += 1) taken.add(`${r + dr}.${c + dc}`);
        const column = input.columnAlign[c - 1] ?? null;
        // A body cell either follows its column or overrides it with another alignment
        const own = r === 1 ? column : next(4) === 0 ? (["left", "center", "right"] as const)[next(3)]! : column;
        spans.push({ r, c, colspan, rowspan, align: own ?? null, valign: next(3) === 0 ? (["top", "middle", "bottom"] as const)[next(3)]! : null });
      }
    }
    return { ...input, spans };
  });

function build(model: ReturnType<typeof layout.map> extends never ? never : { rows: number; cols: number; spans: Span[]; style: string; widths: string; heights: (string | null)[]; caption: string; notes: string }) {
  const rows = Array.from({ length: model.rows }, (_, i) => ({
    type: "tableRow",
    attrs: { height: model.heights[i] ?? null },
    content: model.spans
      .filter((s) => s.r === i + 1)
      .map((s) => ({
        type: i === 0 ? "tableHeader" : "tableCell",
        attrs: { align: s.align, valign: s.valign, colspan: s.colspan, rowspan: s.rowspan, colwidth: null },
        content: [{ type: "paragraph", content: [{ type: "text", text: `r${s.r}c${s.c}` }] }],
      })),
  }));
  return {
    type: "doc" as const,
    content: [{ type: "table", attrs: { label: null, caption: model.caption, notes: model.notes, style: model.style, widths: model.widths }, content: rows }],
  };
}

function shape(doc: ReturnType<typeof parseMarkdown>) {
  const table = doc.content[0] as { content: { attrs: { height: string | null }; content?: { attrs: Record<string, unknown> }[] }[] };
  return table.content.map((row) => ({
    height: row.attrs.height,
    cells: (row.content ?? []).map((c) => [c.attrs.colspan, c.attrs.rowspan, c.attrs.valign ?? null]),
  }));
}

describe("tables with merged cells", () => {
  it("serializing is idempotent and the merges survive a parse", () => {
    fc.assert(
      fc.property(layout, (model) => {
        const original = build(model);
        const first = serializeMarkdown(original);
        const parsed = parseMarkdown(first);
        expect(serializeMarkdown(parsed)).toBe(first);
        expect(shape(parsed)).toEqual(shape(original as unknown as ReturnType<typeof parseMarkdown>));
        // A caption with nothing else is the line itself, so it is the attributes that have to survive
        const attrs = (parsed.content[0] as { attrs: { caption: string; notes: string } }).attrs;
        expect(attrs.notes).toBe(model.notes.trim());
        expect(attrs.caption).toBe(model.caption);
        return true;
      }),
      { numRuns: 600 },
    );
  });
});

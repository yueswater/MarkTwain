import { Node } from "prosemirror-model";
import { MarkdownSerializer, type MarkdownSerializerState } from "prosemirror-markdown";
import { formatAttributes } from "./attributes";
import { escapeLineStart, escapeText } from "./escape";
import { formatCells, formatHeights, normalizeWidths, type CellExtra } from "./table-extras";
import { MarkName, NodeName } from "../model/names";
import { schema } from "../model/schema";
import type { DocJson } from "./parse";

/** A fence is one longer than the longest backtick run in the content. */
function fenceFor(content: string): string {
  const runs = content.match(/`{3,}/g);
  if (!runs) return "```";
  return `${"`".repeat(Math.max(...runs.map((run) => run.length)))}\``;
}

function backticksFor(node: Node, side: -1 | 1): string {
  let longest = 0;
  if (node.isText) {
    for (const match of (node.text ?? "").matchAll(/`+/g)) longest = Math.max(longest, match[0].length);
  }
  const ticks = "`".repeat(longest);
  if (longest > 0 && side > 0) return ` \`${ticks}`;
  if (longest > 0 && side < 0) return `\`${ticks} `;
  return "`";
}

/**
 * Whether a list can use the compact format with no blank line between items, every item has a single paragraph
 * followed at most by a nested list. Items with several paragraphs need the loose format, otherwise the second paragraph
 * is merged into the first when parsed again.
 */
function isTight(list: Node): boolean {
  let tight = true;
  list.forEach((item) => {
    item.forEach((child, _offset, index) => {
      if (index > 0 && child.type.name !== NodeName.BulletList && child.type.name !== NodeName.OrderedList) {
        tight = false;
      }
    });
  });
  return tight;
}

/** Content of an inline formula, trimmed, newlines become spaces, and a $ that is not escaped is escaped, otherwise it would end the formula early. */
function inlineLatex(latex: string): string {
  let flat = latex.replace(/\s*\n\s*/g, " ").trim();
  // A | inside a cell is a column separator, rewrite it as the equivalent \vert{}
  if (inTableCell) flat = flat.replace(/\|/g, "\\vert{}");
  let out = "";
  for (let i = 0; i < flat.length; i += 1) {
    const ch = flat.charAt(i);
    if (ch === "\\") {
      out += ch + flat.charAt(i + 1);
      i += 1;
    } else {
      out += ch === "$" ? "\\$" : ch;
    }
  }
  return out;
}

const SIMPLE_KEY = /^[A-Za-z0-9_](?:[A-Za-z0-9_]|[:.\-/+](?=[A-Za-z0-9_]))*$/;

/** Writing a table cell now, | must be escaped, hard breaks become spaces and | in formulas is rewritten. */
let inTableCell = false;

/** Footnote content of this serialization in order of appearance, serializing is synchronous so module level storage is safe. */
let footnotes: string[] = [];

function keyToken(key: string, forceBraces: boolean): string {
  return forceBraces || !SIMPLE_KEY.test(key) ? `@{${key}}` : `@${key}`;
}

/** Text edges of the previous and next sibling, to decide whether a narrative citation needs braces. */
function neighbors(parent: Node, index: number): { previousWord: boolean; nextConflicts: boolean } {
  const previous = index > 0 ? parent.child(index - 1) : null;
  const next = index + 1 < parent.childCount ? parent.child(index + 1) : null;
  const previousWord = Boolean(previous?.isText && /\w$/.test(previous.text ?? ""));
  const nextConflicts = Boolean(next?.isText && /^[\w.:\-/+]/.test(next.text ?? ""));
  return { previousWord, nextConflicts };
}

/** Destination of an image, <…> is used when it contains spaces or parentheses. */
function destination(src: string): string {
  return /[\s()<>]/.test(src) ? `<${src}>` : src;
}

/** Caption of a figure, one line, trimmed, with brackets escaped since brackets inside ![…] must be paired. */
function figureCaption(caption: string): string {
  return caption.replace(/\s*\n\s*/g, " ").trim().replace(/([[\]])/g, "\\$1");
}

/** Makes the current block break only one line before the next write, not leave a blank line. The types of prosemirror-markdown do not expose it. */
function endLine(state: MarkdownSerializerState): void {
  (state as unknown as { flushClose(size: number): void }).flushClose(1);
}


/** Writes the paragraph of a cell as one line of text, borrowing the output buffer of state and restoring it afterwards. */
function renderCell(state: MarkdownSerializerState, paragraph: Node | null): string {
  if (!paragraph) return "";
  const internal = state as unknown as { out: string; delim: string; closed: unknown; atBlockStart: boolean };
  const saved = { out: internal.out, delim: internal.delim, closed: internal.closed, atBlockStart: internal.atBlockStart };
  internal.out = "";
  internal.delim = "";
  internal.closed = null;
  inTableCell = true;
  try {
    state.renderInline(paragraph, true);
    return internal.out.replace(/\s*\n\s*/g, " ").trim();
  } finally {
    inTableCell = false;
    Object.assign(internal, saved);
  }
}

function alignMarker(align: string | null): string {
  if (align === "left") return ":---";
  if (align === "center") return ":---:";
  if (align === "right") return "---:";
  return "---";
}

const serializer = new MarkdownSerializer(
  {
    [NodeName.Paragraph](state, node) {
      state.renderInline(node);
      state.closeBlock(node);
    },

    [NodeName.Heading](state, node) {
      state.write(`${state.repeat("#", node.attrs.level as number)} `);
      state.renderInline(node, false);
      const label = node.attrs.label as string | null;
      if (label) state.write(` ${formatAttributes({ id: label, classes: [], props: {} })}`);
      state.closeBlock(node);
    },

    [NodeName.Blockquote](state, node) {
      state.wrapBlock("> ", null, node, () => state.renderContent(node));
    },

    [NodeName.BulletList](state, node) {
      state.options.tightLists = isTight(node);
      state.renderList(node, "  ", () => "- ");
    },

    [NodeName.OrderedList](state, node) {
      const start = (node.attrs.start as number | null) ?? 1;
      const width = String(start + node.childCount - 1).length;
      const indent = state.repeat(" ", width + 2);
      state.options.tightLists = isTight(node);
      state.renderList(node, indent, (i) => {
        const number = String(start + i);
        return `${state.repeat(" ", width - number.length)}${number}. `;
      });
    },

    [NodeName.ListItem](state, node) {
      state.renderContent(node);
    },

    [NodeName.CodeBlock](state, node) {
      const fence = fenceFor(node.textContent);
      const language = node.attrs.language as string | null;
      const label = node.attrs.label as string | null;
      const caption = node.attrs.caption as string | null;
      const attributes = formatAttributes({
        id: label,
        classes: [],
        props: caption ? { caption } : {},
      });
      const info = [language, attributes].filter(Boolean).join(" ");
      state.write(`${fence}${info}\n`);
      state.text(node.textContent, false);
      state.write("\n");
      state.write(fence);
      state.closeBlock(node);
    },

    [NodeName.HorizontalRule](state, node) {
      state.write("---");
      state.closeBlock(node);
    },

    [NodeName.InlineMath](state, node) {
      state.write(`$${inlineLatex(String(node.attrs.latex))}$`);
    },

    [NodeName.BlockMath](state, node) {
      const label = node.attrs.label as string | null;
      state.write("$$\n");
      state.text(String(node.attrs.latex).trim(), false);
      state.write("\n$$");
      if (label) state.write(` ${formatAttributes({ id: label, classes: [], props: {} })}`);
      state.closeBlock(node);
    },

    [NodeName.Table](state, node) {
      type Slot = { text: string; align: string | null; real: boolean };
      const grid: (Slot | undefined)[][] = [];
      const extras = new Map<string, CellExtra>();
      const heights = new Map<number, string>();

      node.forEach((tableRow, _offset, rowIndex) => {
        const r = rowIndex + 1;
        grid[rowIndex] ??= [];
        const height = tableRow.attrs.height as string | null;
        if (height) heights.set(r, height);
        let c = 0;
        tableRow.forEach((cell) => {
          while (grid[rowIndex]?.[c]) c += 1;
          const colspan = Math.max(1, Number(cell.attrs.colspan) || 1);
          const rowspan = Math.max(1, Number(cell.attrs.rowspan) || 1);
          const align = (cell.attrs.align as string | null) ?? null;
          const valign = (cell.attrs.valign as string | null) ?? null;
          for (let dr = 0; dr < rowspan; dr += 1) {
            grid[rowIndex + dr] ??= [];
            for (let dc = 0; dc < colspan; dc += 1) {
              (grid[rowIndex + dr] as Slot[])[c + dc] =
                dr === 0 && dc === 0 ? { text: renderCell(state, cell.firstChild), align, real: true } : { text: "", align: null, real: false };
            }
          }
          const extra: CellExtra = {};
          if (colspan > 1) extra.colspan = colspan;
          if (rowspan > 1) extra.rowspan = rowspan;
          if (valign) extra.valign = valign as CellExtra["valign"];
          if (r > 1 && align) extra.align = align as CellExtra["align"];
          if (Object.keys(extra).length > 0) extras.set(`${r}.${c + 1}`, extra);
          c += colspan;
        });
      });

      const width = Math.max(1, ...grid.map((cells) => cells.length));
      const slot = (cells: (Slot | undefined)[], c: number): Slot => cells[c] ?? { text: "", align: null, real: false };
      const line = (cells: (Slot | undefined)[]) =>
        `| ${Array.from({ length: width }, (_, c) => slot(cells, c).text).join(" | ")} |`;

      const header = grid[0] ?? [];
      const columnAlign = Array.from({ length: width }, (_, c) => slot(header, c).align);
      // A body cell only needs its own entry when it differs from the column.
      for (const [position, extra] of extras) {
        const c = Number(position.split(".")[1]);
        if (extra.align && extra.align === (columnAlign[c - 1] ?? null)) {
          delete extra.align;
          if (Object.keys(extra).length === 0) extras.delete(position);
        }
      }
      const lines = [
        line(header),
        `| ${columnAlign.map((align) => alignMarker(align)).join(" | ")} |`,
        ...grid.slice(1).map(line),
      ];
      state.text(lines.join("\n"), false);
      state.closeBlock(node);

      const caption = String(node.attrs.caption).replace(/\s*\n\s*/g, " ").trim();
      const notes = String(node.attrs.notes).replace(/\s*\n\s*/g, " ").trim();
      const label = node.attrs.label as string | null;
      const props: Record<string, string> = {};
      if (notes) props.notes = notes;
      if (node.attrs.style === "grid") props.style = "grid";
      const widths = normalizeWidths(String(node.attrs.widths ?? ""));
      if (widths) props.widths = widths;
      if (heights.size > 0) props.heights = formatHeights(heights);
      if (extras.size > 0) props.cells = formatCells(extras);
      const attributes = formatAttributes({ id: label, classes: [], props });
      if (caption || attributes) {
        state.write(`: ${[caption, attributes].filter(Boolean).join(" ")}`);
        state.closeBlock(node);
      }
    },

    [NodeName.DefinitionList](state, node) {
      state.renderContent(node);
    },

    [NodeName.DefinitionTerm](state, node) {
      state.renderInline(node);
      state.closeBlock(node);
    },

    [NodeName.DefinitionDescription](state, node) {
      endLine(state); // Only one line between a term and its description
      state.wrapBlock("  ", ": ", node, () => state.renderContent(node));
    },

    [NodeName.Figure](state, node) {
      const label = node.attrs.label as string | null;
      const width = node.attrs.width as string | null;
      const attributes = formatAttributes({ id: label, classes: [], props: width ? { width } : {} });
      state.write(
        `![${figureCaption(String(node.attrs.caption))}](${destination(String(node.attrs.src))})${attributes}`,
      );
      state.closeBlock(node);
    },

    [NodeName.FigureGroup](state, node) {
      const grid = node.attrs.layout === "grid";
      const columns = node.attrs.columns as string | null;
      const attributes = formatAttributes({
        id: node.attrs.label as string | null,
        classes: [grid ? "figgrid" : "figrow"],
        props: columns ? { columns } : {},
      });
      state.write(`::: ${attributes}\n`);
      state.renderContent(node);
      const caption = String(node.attrs.caption).replace(/\s*\n\s*/g, " ").trim();
      if (caption) {
        state.write(escapeLineStart(caption));
        state.closeBlock(node);
      }
      endLine(state);
      state.write(":::");
      state.closeBlock(node);
    },

    [NodeName.Div](state, node) {
      const attributes = formatAttributes({
        id: node.attrs.id as string | null,
        classes: node.attrs.classes as string[],
        props: node.attrs.props as Record<string, string>,
      });
      state.write(attributes ? `::: ${attributes}\n` : "::: div\n");
      state.renderContent(node);
      endLine(state);
      state.write(":::");
      state.closeBlock(node);
    },

    [NodeName.Footnote](state, node) {
      const text = String(node.attrs.text).replace(/\s*\n\s*/g, " ").trim();
      if (text === "") return;
      footnotes.push(text);
      state.write(`[^${footnotes.length}]`);
    },

    [NodeName.Citation](state, node, parent, index) {
      const keys = node.attrs.keys as string[];
      const form = node.attrs.form as string;
      if (keys.length === 0) return;

      if (form === "prose" && keys.length === 1) {
        const { previousWord, nextConflicts } = neighbors(parent, index);
        state.write(keyToken(keys[0] ?? "", previousWord || nextConflicts));
      } else if (form === "year") {
        state.write(`[${keys.map((key) => `-${keyToken(key, false)}`).join("; ")}]`);
      } else if (form === "author" && keys.length === 1) {
        state.write(`[${keyToken(keys[0] ?? "", false)}]{.author}`);
      } else {
        state.write(`[${keys.map((key) => keyToken(key, false)).join("; ")}]`);
      }
    },

    [NodeName.CrossRef](state, node, parent, index) {
      const label = String(node.attrs.label);
      const { previousWord, nextConflicts } = neighbors(parent, index);
      state.write(keyToken(label, previousWord || nextConflicts));
    },

    [NodeName.HardBreak](state, node, parent, index) {
      if (inTableCell) {
        state.write(" ");
        return;
      }
      // A newline at the end of a paragraph is meaningless, not written
      for (let i = index + 1; i < parent.childCount; i += 1) {
        if (parent.child(i).type !== node.type) {
          state.write("\\\n");
          return;
        }
      }
    },

    [NodeName.Text](state: MarkdownSerializerState, node, parent) {
      // These two members exist at run time but the type declaration of prosemirror-markdown marks them as internal
      const internal = state as unknown as { atBlockStart: boolean; atBlank(): boolean };
      const startOfLine = internal.atBlockStart || internal.atBlank();
      const inHeading = parent.type.name === NodeName.Heading;
      state.text(escapeText(node.text ?? "", { startOfLine, inHeading, inTableCell }), false);
    },
  },
  {
    [MarkName.Italic]: { open: "*", close: "*", mixable: true, expelEnclosingWhitespace: true },
    [MarkName.Bold]: { open: "**", close: "**", mixable: true, expelEnclosingWhitespace: true },
    [MarkName.Strike]: { open: "~~", close: "~~", mixable: true, expelEnclosingWhitespace: true },
    [MarkName.Link]: {
      open: "[",
      close(_state, mark) {
        const raw = String(mark.attrs.href);
        const href = /\s/.test(raw) ? `<${raw}>` : raw.replace(/[()"]/g, "\\$&");
        const title = mark.attrs.title
          ? ` "${String(mark.attrs.title).replace(/"/g, '\\"')}"`
          : "";
        return `](${href}${title})`;
      },
      mixable: true,
    },
    [MarkName.Code]: {
      open: (_state, _mark, parent, index) => backticksFor(parent.child(index), -1),
      close: (_state, _mark, parent, index) => backticksFor(parent.child(index - 1), 1),
      escape: false,
    },
  },
);

/** Serializes ProseMirror or TipTap JSON into Markdown in canonical form. The document ends with one newline. */
export function serializeMarkdown(doc: DocJson): string {
  footnotes = [];
  const body = serializer.serialize(Node.fromJSON(schema, doc));
  const definitions = footnotes.map((text, i) => `[^${i + 1}]: ${text}`);
  footnotes = [];
  if (body === "" && definitions.length === 0) return "";
  return `${[body, ...(definitions.length > 0 ? [definitions.join("\n")] : [])].join("\n\n")}\n`;
}

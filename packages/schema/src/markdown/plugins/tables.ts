import { parseAttributes } from "../attributes";
import { normalizeWidths, parseCells, parseHeights, parseWidths, type CellExtra } from "../table-extras";
import type { MarkdownItInstance } from "../markdown-it";

type CoreState = InstanceType<MarkdownItInstance["core"]["State"]>;
type Token = CoreState["tokens"][number];

/** The caption line after a table, : caption {#tbl:x notes=…}, the braces may be left out. */
const CAPTION = /^:\s+/;
const TRAILING_ATTRIBUTES = /\s*\{([^{}]*)\}\s*$/;

type CaptionMeta = {
  caption: string;
  label: string | null;
  notes: string;
  style: "three-line" | "grid";
  widths: string;
  heights: Map<number, string>;
  cells: Map<string, CellExtra>;
};

function parseCaption(content: string): CaptionMeta {
  let caption = content.replace(CAPTION, "").trim();
  let label: string | null = null;
  let notes = "";
  let style: CaptionMeta["style"] = "three-line";
  let widths = "";
  let heights = new Map<number, string>();
  let cells = new Map<string, CellExtra>();

  const match = TRAILING_ATTRIBUTES.exec(caption);
  const attributes = match ? parseAttributes(match[1] ?? "") : null;
  if (match && attributes) {
    label = attributes.id;
    notes = attributes.props.notes ?? "";
    if (attributes.props.style === "grid") style = "grid";
    widths = normalizeWidths(attributes.props.widths ?? "");
    heights = parseHeights(attributes.props.heights ?? "");
    cells = parseCells(attributes.props.cells ?? "");
    caption = caption.slice(0, match.index).trim();
  }
  return { caption, label, notes, style, widths, heights, cells };
}

/**
 * 1. Inline content of a cell is wrapped in a paragraph, since the content model of a cell is one paragraph.
 * 2. The ": caption {…}" paragraph after a table is merged into the table and does not stay in the document.
 */
function promoteTables(state: CoreState): void {
  const tokens = state.tokens;
  const result: Token[] = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token) continue;

    if (token.type === "th_open" || token.type === "td_open") {
      result.push(token);
      const inline = tokens[i + 1];
      if (inline?.type === "inline") {
        const open = new state.Token("paragraph_open", "p", 1);
        open.block = true;
        const close = new state.Token("paragraph_close", "p", -1);
        close.block = true;
        result.push(open, inline, close);
        i += 1;
      }
      continue;
    }

    if (token.type === "table_close") {
      result.push(token);
      const open = tokens[i + 1];
      const inline = tokens[i + 2];
      const close = tokens[i + 3];
      if (
        open?.type === "paragraph_open" &&
        inline?.type === "inline" &&
        close?.type === "paragraph_close" &&
        CAPTION.test(inline.content)
      ) {
        const meta = parseCaption(inline.content);
        const tableOpen = findOpen(result);
        if (tableOpen) {
          tableOpen.meta = { caption: meta.caption, label: meta.label, notes: meta.notes, style: meta.style, widths: meta.widths };
          result.splice(0, result.length, ...applyExtras(result, result.indexOf(tableOpen), meta));
        }
        i += 3;
      }
      continue;
    }

    result.push(token);
  }

  state.tokens = result;
}

/** Pixel width that the editor starts a percentage column with, a table is about this wide. */
const EDITOR_TABLE_PX = 700;

function pixels(width: string | null): number | null {
  if (width === null) return null;
  const match = /^(\d+(?:\.\d+)?)%$/.exec(width);
  return match ? Math.round((Number(match[1]) * EDITOR_TABLE_PX) / 100) : null;
}

type Cell = { open: number; close: number; row: number; col: number };

/**
 * Applies the caption line attributes to the tokens of the table that starts at index from:
 * row heights, merged cells, per cell alignment and column widths. Cells covered by a merge are removed.
 */
function applyExtras(tokens: Token[], from: number, meta: CaptionMeta): Token[] {
  const cells: Cell[] = [];
  const rows: { open: number }[] = [];
  let row = 0;
  let col = 0;
  for (let i = from; i < tokens.length; i += 1) {
    const type = tokens[i]?.type;
    if (type === "tr_open") {
      row += 1;
      col = 0;
      rows.push({ open: i });
    } else if (type === "th_open" || type === "td_open") {
      col += 1;
      const close = tokens.findIndex((t, j) => j > i && (t.type === "th_close" || t.type === "td_close"));
      cells.push({ open: i, close, row, col });
    }
  }

  const widths = parseWidths(meta.widths);
  rows.forEach((r, index) => {
    const height = meta.heights.get(index + 1);
    const token = tokens[r.open];
    if (token && height) token.meta = { height };
  });

  const covered = new Set<string>();
  for (const cell of cells) {
    const extra = meta.cells.get(`${cell.row}.${cell.col}`);
    const colspan = extra?.colspan ?? 1;
    const rowspan = extra?.rowspan ?? 1;
    const token = tokens[cell.open];
    if (!token) continue;
    for (let dr = 0; dr < rowspan; dr += 1) {
      for (let dc = 0; dc < colspan; dc += 1) {
        if (dr > 0 || dc > 0) covered.add(`${cell.row + dr}.${cell.col + dc}`);
      }
    }
    const spanned = widths.slice(cell.col - 1, cell.col - 1 + colspan).map(pixels);
    token.meta = {
      colspan,
      rowspan,
      align: extra?.align ?? null,
      valign: extra?.valign ?? null,
      colwidth: spanned.length === colspan && spanned.every((w) => w !== null) ? spanned : null,
    };
  }

  if (covered.size === 0) return tokens;
  const drop = new Set<number>();
  for (const cell of cells) {
    if (!covered.has(`${cell.row}.${cell.col}`)) continue;
    for (let i = cell.open; i <= cell.close; i += 1) drop.add(i);
  }
  return tokens.filter((_, i) => !drop.has(i));
}

/** Looks back for the nearest table_open that is not matched yet. */
function findOpen(tokens: Token[]): Token | undefined {
  let depth = 0;
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const type = tokens[i]?.type;
    if (type === "table_close") depth += 1;
    if (type === "table_open") {
      depth -= 1;
      if (depth === 0) return tokens[i];
    }
  }
  return undefined;
}

export function tablesPlugin(md: MarkdownItInstance): void {
  md.core.ruler.push("tables", promoteTables);
}

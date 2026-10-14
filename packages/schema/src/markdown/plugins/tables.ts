import { parseAttributes } from "../attributes";
import type { MarkdownItInstance } from "../markdown-it";

type CoreState = InstanceType<MarkdownItInstance["core"]["State"]>;
type Token = CoreState["tokens"][number];

/** The caption line after a table, : caption {#tbl:x notes=…}, the braces may be left out. */
const CAPTION = /^:\s+/;
const TRAILING_ATTRIBUTES = /\s*\{([^{}]*)\}\s*$/;

function parseCaption(content: string): { caption: string; label: string | null; notes: string } {
  let caption = content.replace(CAPTION, "").trim();
  let label: string | null = null;
  let notes = "";

  const match = TRAILING_ATTRIBUTES.exec(caption);
  const attributes = match ? parseAttributes(match[1] ?? "") : null;
  if (match && attributes) {
    label = attributes.id;
    notes = attributes.props.notes ?? "";
    caption = caption.slice(0, match.index).trim();
  }
  return { caption, label, notes };
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
        const tableOpen = findOpen(result);
        if (tableOpen) tableOpen.meta = parseCaption(inline.content);
        i += 3;
      }
      continue;
    }

    result.push(token);
  }

  state.tokens = result;
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

import type { MarkdownItInstance } from "../markdown-it";

type CoreState = InstanceType<MarkdownItInstance["core"]["State"]>;
type Token = CoreState["tokens"][number];

/** Meta of div_open, set by the div plugin. */
type DivMeta = { id?: string | null; classes?: string[]; props?: Record<string, string> };

/**
 * 1. An image alone in a paragraph becomes a figure block, the caption is the alt source and label and width come from attributes.
 * 2. An image left inside text is downgraded to text, the dialect supports only figures in their own paragraph.
 * 3. A .figrow or .figgrid div whose content fits becomes figure_group, all figures,
 *    with an optional last paragraph as the overall caption. Otherwise it stays a plain div.
 */
function promoteFigures(state: CoreState): void {
  const tokens = state.tokens;
  const promoted: Token[] = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const open = tokens[i];
    const inline = tokens[i + 1];
    const close = tokens[i + 2];
    const only = inline?.children?.length === 1 ? inline.children[0] : undefined;
    const inCell = promoted[promoted.length - 1]?.type === "th_open" || promoted[promoted.length - 1]?.type === "td_open";
    if (
      !inCell &&
      open?.type === "paragraph_open" &&
      inline?.type === "inline" &&
      close?.type === "paragraph_close" &&
      only?.type === "image"
    ) {
      const figure = new state.Token("figure", "figure", 0);
      figure.block = true;
      figure.map = open.map;
      figure.content = only.content;
      figure.meta = {
        src: only.attrGet("src") ?? "",
        id: only.attrGet("id"),
        width: only.attrGet("width"),
        placement: only.attrGet("placement"),
      };
      promoted.push(figure);
      i += 2;
    } else if (open) {
      promoted.push(open);
    }
  }

  for (const token of promoted) {
    if (token.type !== "inline" || !token.children) continue;
    token.children = token.children.map((child) => {
      if (child.type !== "image") return child;
      const text = new state.Token("text", "", 0);
      text.content = `![${child.content}](${child.attrGet("src") ?? ""})`;
      return text;
    });
  }

  state.tokens = groupFigures(promoted, state);
}

function groupFigures(tokens: Token[], state: CoreState): Token[] {
  const result: Token[] = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token) continue;
    const meta = (token.type === "div_open" ? token.meta : {}) as DivMeta;
    const classes = meta.classes ?? [];

    if (!classes.includes("figrow") && !classes.includes("figgrid")) {
      result.push(token);
      continue;
    }

    let depth = 1;
    let end = i + 1;
    for (; end < tokens.length; end += 1) {
      if (tokens[end]?.type === "div_open") depth += 1;
      if (tokens[end]?.type === "div_close") depth -= 1;
      if (depth === 0) break;
    }
    const inner = tokens.slice(i + 1, end);

    let figures = 0;
    while (inner[figures]?.type === "figure") figures += 1;
    const captionOpen = inner[figures];
    const hasCaption =
      captionOpen?.type === "paragraph_open" &&
      inner[figures + 1]?.type === "inline" &&
      inner[figures + 2]?.type === "paragraph_close" &&
      figures + 3 === inner.length;
    const valid = figures > 0 && (figures === inner.length || hasCaption);

    if (!valid) {
      result.push(token);
      continue;
    }

    const open = new state.Token("figure_group_open", "figure-group", 1);
    open.block = true;
    open.map = token.map;
    open.meta = {
      id: meta.id ?? null,
      layout: classes.includes("figgrid") ? "grid" : "row",
      columns: meta.props?.columns ?? null,
      placement: meta.props?.placement ?? null,
      caption: hasCaption ? (inner[figures + 1]?.content ?? "") : "",
    };
    result.push(open, ...inner.slice(0, figures));
    const close = new state.Token("figure_group_close", "figure-group", -1);
    close.block = true;
    result.push(close);
    i = end;
  }

  return result;
}

export function figuresPlugin(md: MarkdownItInstance): void {
  md.core.ruler.push("figures", promoteFigures);
}

/**
 * Intermediate representation, a tree of blocks and inlines independent of Typst or LaTeX syntax, see section 5 of the spec.
 * Resolved here, inline content of footnotes and captions is parsed and the kind of every cross-reference is known,
 * and references to missing targets became plain text. Renderers only turn it into their own syntax.
 */
export type TextMark = "bold" | "italic" | "strike";

export type Inline =
  | { type: "text"; text: string; marks: TextMark[]; link: string | null }
  | { type: "code"; text: string }
  | { type: "math"; latex: string }
  | { type: "break" }
  | { type: "footnote"; content: Inline[] }
  | { type: "citation"; keys: string[]; form: CitationForm }
  | { type: "ref"; label: string; kind: RefKind };

export type CitationForm = "paren" | "prose" | "year" | "author";

/** Prefix of the label, one of cha, sec, fig, tbl, eq and lst */
export type RefKind = "cha" | "sec" | "fig" | "tbl" | "eq" | "lst";

export type Align = "left" | "center" | "right" | null;

export type Cell = { content: Inline[]; align: Align };

export type Block =
  | { type: "heading"; level: number; label: string | null; content: Inline[] }
  | { type: "paragraph"; content: Inline[] }
  | { type: "list"; ordered: boolean; start: number; items: Block[][] }
  | { type: "quote"; children: Block[] }
  | {
      type: "code";
      language: string | null;
      label: string | null;
      caption: Inline[];
      text: string;
    }
  | { type: "math"; latex: string; label: string | null }
  | {
      type: "figure";
      src: string;
      caption: Inline[];
      label: string | null;
      /** For example "60%", null means the template default */
      width: string | null;
    }
  | {
      type: "figureGroup";
      layout: "row" | "grid";
      columns: number | null;
      label: string | null;
      caption: Inline[];
      items: { src: string; caption: Inline[] }[];
    }
  | {
      type: "table";
      label: string | null;
      caption: Inline[];
      notes: Inline[];
      /** Header row, null when there is none */
      header: Cell[] | null;
      rows: Cell[][];
    }
  | { type: "rule" }
  | { type: "definitionList"; entries: { term: Inline[]; descriptions: Block[][] }[] }
  | {
      type: "div";
      id: string | null;
      classes: string[];
      props: Record<string, string>;
      children: Block[];
    };

/** IR of one document, the index in blocks is the order of top level blocks, used to map output back to source blocks. */
export type IrDocument = {
  documentId: string;
  blocks: Block[];
};

export type IrIssue = {
  code: "broken-ref" | "unknown-node";
  documentId: string;
  /** Index of the top level block */
  block: number;
  detail: string;
};

export type IrResult = { document: IrDocument; issues: IrIssue[] };

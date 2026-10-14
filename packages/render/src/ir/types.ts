/**
 * 中介表示（IR）：與 Typst、LaTeX 的語法無關的區塊與行內樹（規格第 5 節）。
 * 已解決的事：腳註與圖說的行內內容已解析、交叉引用的種類已判定、
 * 指到不存在目標的引用已退回純文字。渲染器只負責把它轉成各自的語法。
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

/** 標籤的前綴：cha、sec、fig、tbl、eq、lst */
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
      /** 例如 "60%"；null 表示用模板的預設 */
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
      /** 表頭列；沒有表頭時為 null */
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

/** 一份文件的 IR；`blocks` 的索引就是頂層區塊的順序，用來把輸出對回來源區塊。 */
export type IrDocument = {
  documentId: string;
  blocks: Block[];
};

export type IrIssue = {
  code: "broken-ref" | "unknown-node";
  documentId: string;
  /** 頂層區塊的索引 */
  block: number;
  detail: string;
};

export type IrResult = { document: IrDocument; issues: IrIssue[] };

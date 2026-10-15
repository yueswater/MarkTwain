/**
 * A table drawn cell by cell, then written as a pipe table with the attributes of the caption line.
 * Rows and columns count from 1 and a merged cell has placeholder cells under and beside it, as the pipe table of MarkTwain needs.
 */
export type CellSpec = { text: string; colspan?: number; rowspan?: number; align?: "left" | "center" | "right" };

export type TableOptions = {
  caption: string;
  style?: "three-line" | "grid";
  /** One entry for each column, a share such as 20% or auto */
  widths?: string[];
  notes?: string;
  /** Lines that differ from the preset, see the borders attribute of the schema */
  borders?: string;
  /** Alignment of each column in the delimiter row, centered when not given */
  columnAlign?: ("left" | "center" | "right")[];
};

export class Grid {
  private readonly cells = new Map<string, CellSpec>();
  readonly columns: number;
  private rows = 0;

  constructor(columns: number) {
    this.columns = columns;
  }

  /** Puts a cell, a row that does not exist yet is added. */
  set(row: number, column: number, cell: CellSpec | string): this {
    const spec = typeof cell === "string" ? { text: cell } : cell;
    this.cells.set(`${row}.${column}`, spec);
    this.rows = Math.max(this.rows, row + (spec.rowspan ?? 1) - 1);
    return this;
  }

  /** A whole row of plain texts starting at column 1. */
  row(row: number, texts: readonly string[]): this {
    texts.forEach((text, index) => this.set(row, index + 1, text));
    return this;
  }

  get height(): number {
    return this.rows;
  }

  /** The pipe table with the caption line. */
  toMarkdown(options: TableOptions): string {
    const align = (column: number) => ({ left: ":--", center: ":-:", right: "--:" })[options.columnAlign?.[column - 1] ?? "center"];
    const line = (row: number) => {
      const texts: string[] = [];
      for (let column = 1; column <= this.columns; column += 1) texts.push(escape(this.cells.get(`${row}.${column}`)?.text ?? ""));
      return `| ${texts.join(" | ")} |`;
    };
    const lines = [line(1), `|${Array.from({ length: this.columns }, (_, i) => align(i + 1)).join("|")}|`];
    for (let row = 2; row <= this.rows; row += 1) lines.push(line(row));

    const extras = [...this.cells.entries()]
      .filter(([, cell]) => (cell.colspan ?? 1) > 1 || (cell.rowspan ?? 1) > 1 || cell.align !== undefined)
      .sort(([a], [b]) => order(a) - order(b))
      .map(([position, cell]) => {
        const pairs = [
          ...((cell.colspan ?? 1) > 1 ? [`colspan=${cell.colspan}`] : []),
          ...((cell.rowspan ?? 1) > 1 ? [`rowspan=${cell.rowspan}`] : []),
          ...(cell.align ? [`align=${cell.align}`] : []),
        ];
        return `${position}:${pairs.join(",")}`;
      });

    const props = [
      ...(options.style === "grid" ? ["style=grid"] : []),
      ...(options.widths && options.widths.length > 0 ? [`widths="${options.widths.join(",")}"`] : []),
      ...(extras.length > 0 ? [`cells="${extras.join(";")}"`] : []),
      ...(options.borders ? [`borders="${options.borders}"`] : []),
      ...(options.notes ? [`notes="${options.notes.replace(/"/g, "'")}"`] : []),
    ];
    return [...lines, "", `: ${options.caption}${props.length > 0 ? ` {${props.join(" ")}}` : ""}`].join("\n") + "\n";
  }
}

const order = (position: string) => {
  const [row = 0, column = 0] = position.split(".").map(Number);
  return row * 1000 + column;
};

/** A pipe inside a cell would split it, so it is written as the command for a vertical bar. */
function escape(text: string): string {
  return text.replace(/\|/g, "\\vert{}");
}

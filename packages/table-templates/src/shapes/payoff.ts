import { Grid } from "../grid";
import { int, numbered, type Shape } from "./types";

/** A payoff matrix of two players, the corner cell and the name of the column player span, and the name of the row player spans its rows. */
export const payoff: Shape = ({ params, labels }) => {
  const rows = int(params.rows, 2);
  const columns = int(params.columns, 2);
  const grid = new Grid(columns + 2);
  grid.set(1, 1, { text: "", colspan: 2, rowspan: 2 });
  grid.set(1, 3, { text: labels.columnPlayer ?? "", colspan: columns });
  for (let column = 1; column <= columns; column += 1) grid.set(2, column + 2, numbered(labels.column ?? "", column));
  for (let row = 1; row <= rows; row += 1) {
    if (row === 1) grid.set(3, 1, { text: labels.rowPlayer ?? "", rowspan: rows });
    grid.set(row + 2, 2, numbered(labels.row ?? "", row));
    for (let column = 1; column <= columns; column += 1) grid.set(row + 2, column + 2, labels.payoff ?? "");
  }
  return grid.toMarkdown({ caption: labels.caption ?? "", style: "grid" });
};

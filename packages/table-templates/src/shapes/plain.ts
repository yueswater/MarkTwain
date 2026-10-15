import { Grid } from "../grid";
import { int, numbered, type Shape } from "./types";

/** A three-line table with a header row and empty cells. */
export const plain: Shape = ({ params, labels }) => {
  const rows = int(params.rows, 3);
  const columns = int(params.columns, 3);
  const grid = new Grid(columns);
  for (let column = 1; column <= columns; column += 1) grid.set(1, column, params.header === false ? "" : numbered(labels.column ?? "", column));
  for (let row = 2; row <= rows + 1; row += 1) for (let column = 1; column <= columns; column += 1) grid.set(row, column, "");
  return grid.toMarkdown({ caption: labels.caption ?? "", style: "three-line" });
};

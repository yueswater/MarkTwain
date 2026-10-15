import { Grid } from "../grid";
import { int, numbered, type Shape } from "./types";

/** A correlation matrix with ones on the diagonal and nothing above it, the variables numbered so that the columns need no names. */
export const correlation: Shape = ({ params, labels }) => {
  const variables = int(params.variables, 4);
  const grid = new Grid(variables + 1);
  grid.set(1, 1, "");
  for (let column = 1; column <= variables; column += 1) grid.set(1, column + 1, `(${column})`);
  for (let row = 1; row <= variables; row += 1) {
    grid.set(row + 1, 1, `(${row}) ${numbered(labels.variable ?? "", row)}`);
    for (let column = 1; column <= variables; column += 1) {
      grid.set(row + 1, column + 1, column === row ? "1" : column < row ? "0.00" : "");
    }
  }
  return grid.toMarkdown({ caption: labels.caption ?? "", style: "three-line", columnAlign: ["left"], notes: labels.note });
};

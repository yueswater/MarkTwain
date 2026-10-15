import { Grid } from "../grid";
import { int, names, numbered, type Shape } from "./types";

/** One row for each variable with the usual summary numbers in columns. */
export const descriptive: Shape = ({ params, labels }) => {
  const variables = int(params.variables, 5);
  const columns = names(labels.columns ?? "");
  const grid = new Grid(columns.length + 1);
  grid.set(1, 1, labels.variableHeader ?? "");
  columns.forEach((name, index) => grid.set(1, index + 2, name));
  for (let row = 1; row <= variables; row += 1) {
    grid.set(row + 1, 1, numbered(labels.variable ?? "", row));
    columns.forEach((_, index) => grid.set(row + 1, index + 2, index === 0 ? "0" : "0.00"));
  }
  return grid.toMarkdown({ caption: labels.caption ?? "", style: "three-line", columnAlign: ["left"] });
};

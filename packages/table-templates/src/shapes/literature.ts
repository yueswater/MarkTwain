import { Grid } from "../grid";
import { int, names, type Shape } from "./types";

/** A summary of the literature, wide columns of text that are read across, with widths that give the finding the most room. */
export const literature: Shape = ({ params, labels }) => {
  const rows = int(params.rows, 5);
  const columns = names(labels.columns ?? "");
  const grid = new Grid(columns.length);
  columns.forEach((name, index) => grid.set(1, index + 1, name));
  for (let row = 2; row <= rows + 1; row += 1) for (let column = 1; column <= columns.length; column += 1) grid.set(row, column, "");
  const widths = columns.length === 4 ? ["18%", "22%", "20%", "40%"] : [];
  return grid.toMarkdown({ caption: labels.caption ?? "", style: "three-line", widths, columnAlign: columns.map(() => "left" as const) });
};

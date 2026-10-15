import { Grid } from "../grid";
import { int, numbered, type Shape } from "./types";

/** The items of a questionnaire with the loading of each factor, then the eigenvalue and the variance that each factor explains. */
export const loadings: Shape = ({ params, labels }) => {
  const items = int(params.items, 6);
  const factors = int(params.factors, 2);
  const grid = new Grid(factors + 2);
  grid.set(1, 1, labels.item ?? "");
  for (let factor = 1; factor <= factors; factor += 1) grid.set(1, factor + 1, numbered(labels.factor ?? "", factor));
  grid.set(1, factors + 2, labels.communality ?? "");
  for (let row = 1; row <= items; row += 1) {
    grid.set(row + 1, 1, numbered(labels.itemName ?? "", row));
    for (let factor = 1; factor <= factors; factor += 1) grid.set(row + 1, factor + 1, "0.00");
    grid.set(row + 1, factors + 2, "0.00");
  }
  const footer = items + 2;
  grid.set(footer, 1, labels.eigenvalue ?? "");
  grid.set(footer + 1, 1, labels.variance ?? "");
  for (let factor = 1; factor <= factors; factor += 1) {
    grid.set(footer, factor + 1, "0.00");
    grid.set(footer + 1, factor + 1, "0.0%");
  }
  return grid.toMarkdown({ caption: labels.caption ?? "", style: "three-line", columnAlign: ["left"], borders: `h${footer - 1}.*=0.5` });
};

import { Grid } from "../grid";
import { int, numbered, type Shape } from "./types";

/** Several models side by side, each variable with its coefficient and stars and its standard error in brackets in the row below. */
export const regression: Shape = ({ params, labels }) => {
  const models = int(params.models, 3);
  const variables = int(params.variables, 3);
  const grid = new Grid(models + 1);
  grid.set(1, 1, "");
  grid.set(2, 1, labels.dependent ?? "");
  for (let model = 1; model <= models; model += 1) {
    grid.set(1, model + 1, `(${model})`);
    grid.set(2, model + 1, labels.dependentName ?? "");
  }
  let row = 3;
  for (let variable = 1; variable <= variables; variable += 1) {
    grid.set(row, 1, numbered(labels.variable ?? "", variable));
    grid.set(row + 1, 1, "");
    for (let model = 1; model <= models; model += 1) {
      grid.set(row, model + 1, labels.coefficient ?? "");
      grid.set(row + 1, model + 1, labels.standardError ?? "");
    }
    row += 2;
  }
  const footer = row;
  grid.set(footer, 1, labels.observations ?? "");
  grid.set(footer + 1, 1, labels.rSquared ?? "");
  for (let model = 1; model <= models; model += 1) {
    grid.set(footer, model + 1, "0");
    grid.set(footer + 1, model + 1, "0.000");
  }
  // A line under the name of the dependent variable and one above the summary of the models
  return grid.toMarkdown({
    caption: labels.caption ?? "",
    style: "three-line",
    columnAlign: ["left"],
    notes: labels.note,
    borders: `h2.*=0.5;h${footer - 1}.*=0.5`,
  });
};

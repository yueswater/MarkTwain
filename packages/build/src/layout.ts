import type { BuildDocument } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

/** Content file path for each document, following the template layout. */
export function assignPaths(documents: BuildDocument[]): Map<string, string> {
  const paths = new Map<string, string>();
  let chapters = 0;
  let appendices = 0;
  for (const doc of documents) {
    switch (doc.kind) {
      case "abstract":
        paths.set(doc.id, "contents/front/abstract.typ");
        break;
      case "acknowledgement":
        paths.set(doc.id, "contents/front/acknowledgement.typ");
        break;
      case "denotation":
        paths.set(doc.id, "contents/front/denotation.typ");
        break;
      case "chapter":
        paths.set(doc.id, `contents/chapter${pad(++chapters)}.typ`);
        break;
      case "appendix":
        paths.set(doc.id, `contents/back/appendix${pad(++appendices)}.typ`);
        break;
    }
  }
  return paths;
}

/**
 * Generates main.typ from the documents that exist.
 * Order follows the template: acknowledgement, abstract, notation, chapters, references, appendices.
 */
export function renderMain(documents: BuildDocument[], paths: Map<string, string>, hasBibliography: boolean): string {
  const include = (kind: BuildDocument["kind"]) =>
    documents.filter((d) => d.kind === kind).map((d) => `#include "${paths.get(d.id)}"`);
  const chapters = include("chapter");
  const appendices = include("appendix");
  const lines = [
    '#import "helper/mod.typ": *',
    "",
    "#show: thesis",
    "#set math.equation(numbering: eq-numbering)",
    "",
    ...include("acknowledgement"),
    ...include("abstract"),
    ...include("denotation"),
    "",
    '#set heading(numbering: "1.1")',
    ...chapters,
    ...(hasBibliography ? ["", "#references()"] : []),
    ...(appendices.length > 0 ? ["", ...appendices] : []),
  ];
  return lines.join("\n") + "\n";
}

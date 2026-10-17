import type { BuildDocument } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

/** Content file path for each document, following the template layout, ext is the extension of the output, typ or tex. */
export function assignPaths(documents: BuildDocument[], ext: "typ" | "tex" = "typ"): Map<string, string> {
  const paths = new Map<string, string>();
  let chapters = 0;
  let appendices = 0;
  for (const doc of documents) {
    switch (doc.kind) {
      case "abstract":
        paths.set(doc.id, `contents/front/abstract.${ext}`);
        break;
      case "abstractEn":
        paths.set(doc.id, `contents/front/abstract-en.${ext}`);
        break;
      case "acknowledgement":
        paths.set(doc.id, `contents/front/acknowledgement.${ext}`);
        break;
      case "denotation":
        paths.set(doc.id, `contents/front/denotation.${ext}`);
        break;
      case "chapter":
        paths.set(doc.id, `contents/chapter${pad(++chapters)}.${ext}`);
        break;
      case "appendix":
        paths.set(doc.id, `contents/back/appendix${pad(++appendices)}.${ext}`);
        break;
    }
  }
  return paths;
}

/**
 * Generates main.typ from the documents that exist.
 * Order follows the template: acknowledgement, abstract in Chinese and in English, notation, chapters, references, appendices.
 */
export function renderMain(
  documents: BuildDocument[],
  paths: Map<string, string>,
  hasBibliography: boolean,
  /** Which kinds of list have markers of their own, see the lists section of the thesis settings */
  lists: { ordered: boolean; bullet: boolean } = { ordered: false, bullet: false },
): string {
  const include = (kind: BuildDocument["kind"]) =>
    documents.filter((d) => d.kind === kind).map((d) => `#include "${paths.get(d.id)}"`);
  // A chapter or an appendix starts on a page of its own, also when it begins with text and not with a heading, or it would run on after the abstract
  const newPage = (files: string[]) => files.flatMap((file) => ["#pagebreak(weak: true)", file]);
  const chapters = newPage(include("chapter"));
  const appendices = newPage(include("appendix"));
  const lines = [
    '#import "helper/mod.typ": *',
    "",
    "#show: thesis",
    "#set math.equation(numbering: eq-numbering)",
    ...(lists.ordered ? ['#import "marktwain.typ": mt-enum-numbering', "#set enum(numbering: mt-enum-numbering, full: true)"] : []),
    ...(lists.bullet ? ['#import "marktwain.typ": mt-list-markers', "#set list(marker: mt-list-markers)"] : []),
    "",
    ...include("acknowledgement"),
    ...include("abstract"),
    ...include("abstractEn"),
    ...include("denotation"),
    "",
    '#set heading(numbering: "1.1")',
    ...chapters,
    ...(hasBibliography ? ["", "#references()"] : []),
    ...(appendices.length > 0 ? ["", ...appendices] : []),
  ];
  return lines.join("\n") + "\n";
}

/**
 * Generates main.tex from the documents that exist, in the order of the template.
 * The helpers of MarkTwain are read after the class, before the document starts.
 */
export function renderMainLatex(documents: BuildDocument[], paths: Map<string, string>, hasBibliography: boolean, watermark = false): string {
  const include = (kind: BuildDocument["kind"]) =>
    documents.filter((d) => d.kind === kind).map((d) => `\\input{${(paths.get(d.id) ?? "").replace(/\.tex$/, "")}}`);
  // A chapter or an appendix starts on a page of its own, also when it begins with text and not with a heading
  const newPage = (files: string[]) => files.flatMap((file) => ["\\clearpage", file]);
  const appendices = newPage(include("appendix"));
  const chapters = newPage(include("chapter"));
  const lines = [
    // The template reads this switch, latexmk -usepretex would set it too but then replaces the tw_xelatex of the latexmkrc and citeproc never runs
    ...(watermark ? ["\\def\\twwatermark{1}"] : []),
    "\\documentclass{tw-thesis}",
    "\\input{marktwain}",
    "",
    "\\begin{document}",
    "",
    "\\thesisfront",
    "",
    ...include("acknowledgement"),
    ...include("abstract"),
    ...include("abstractEn"),
    ...include("denotation"),
    "",
    ...chapters,
    ...(hasBibliography ? ["", "\\references"] : []),
    ...(appendices.length > 0 ? ["", "\\appendix", ...appendices] : []),
    "",
    "\\end{document}",
  ];
  return lines.join("\n") + "\n";
}

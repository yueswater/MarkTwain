import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { basename } from "node:path";
import { writeBytes, writeText } from "./process";
import type { BuildInput } from "./types";

/** The file name of each kind of document, the numbered ones count from 1 in the order of the thesis. */
function nameOf(kind: BuildInput["documents"][number]["kind"], count: number): string {
  const number = String(count).padStart(2, "0");
  switch (kind) {
    case "abstract":
      return "abstract";
    case "abstractEn":
      return "abstract-en";
    case "acknowledgement":
      return "acknowledgement";
    case "denotation":
      return "denotation";
    case "chapter":
      return `chapter${number}`;
    case "appendix":
      return `appendix${number}`;
  }
}

/**
 * Writes the sources of the thesis into a new folder: one `.md` file for each document, the images where the documents point to
 * them, the bibliography files and the settings. Everything is at the top level, so the links to the images work from every file.
 * The files are in the dialect of the project, which is Markdown with a few extra forms for the blocks of a thesis.
 */
export function exportMarkdownProject(input: Pick<BuildInput, "documents" | "files" | "bibliography" | "config">, destination: string): { files: string[] } {
  if (existsSync(destination) && readdirSync(destination).length > 0) {
    throw new Error(`${basename(destination)} is not empty`);
  }
  mkdirSync(destination, { recursive: true });
  const written: string[] = [];
  const counts: Record<string, number> = {};
  for (const doc of input.documents) {
    counts[doc.kind] = (counts[doc.kind] ?? 0) + 1;
    const path = `${nameOf(doc.kind, counts[doc.kind] as number)}.md`;
    writeText(destination, path, doc.text);
    written.push(path);
  }
  for (const file of input.files) {
    writeBytes(destination, file.path, file.data);
    written.push(file.path);
  }
  for (const file of input.bibliography) {
    writeBytes(destination, file.path, file.data);
    written.push(file.path);
  }
  writeText(destination, "config.yml", input.config);
  written.push("config.yml");
  return { files: written };
}

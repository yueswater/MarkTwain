import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { delimiter, join, parse } from "node:path";
import { collectTargets, parseMarkdown, resolveListLevels, resolvePlacementDefaults, resolveStatementStyle } from "@marktwain/schema";
import { renderLatexFile, renderStatementsLatex, toIr, type IrDocument, type IrIssue } from "@marktwain/render";
import { bibliographyKeys } from "./bibliography-keys";
import { completeConfig } from "./config";
import { checkImages, type ImageIssue } from "./images";
import type { LineMap } from "./diagnostics";
import { parseTexLog } from "./diagnostics-tex";
import { assignPaths, renderMainLatex } from "./layout";
import { copyTree, run, writeBytes, writeText } from "./process";
import type { BuildInput, BuildResult, Diagnostic } from "./types";

export type LatexBuildInput = Omit<BuildInput, "typst" | "packageCachePath" | "format" | "ppi" | "anchors"> & {
  /** Folder with xelatex, latexmk and texlua, null when they are found on the PATH */
  texBin: string | null;
};

/** Template folders that the build only reads, linked so that a build does not copy the fonts. */
const SHARED = ["fonts", "schools", "scripts", "i18n"];

/** Template files that are small and needed by every build. */
const COPIED = ["tw-thesis.cls", "tw-thesis.sty", "latexmkrc"];

const ASCII = /^[\x20-\x7e]*$/;

/**
 * The folder for the build. LaTeX engines have a history of trouble with non-ASCII paths on Windows, so a work folder
 * with such characters, usually the name of the user, is replaced by a fixed folder with an ASCII path.
 */
export function latexWorkDir(workDir: string, platform: NodeJS.Platform = process.platform, programData: string | undefined = process.env.ProgramData): string {
  if (platform !== "win32" || ASCII.test(workDir)) return workDir;
  const base = programData && ASCII.test(programData) ? programData : join(parse(workDir).root, "ProgramData");
  const fallback = join(base, "MarkTwain", "build");
  mkdirSync(fallback, { recursive: true });
  return fallback;
}

/** The environment of a TeX run, the folder of the binaries goes first on the PATH. */
export function texEnvironment(texBin: string | null, current: NodeJS.ProcessEnv = process.env): Record<string, string> {
  if (!texBin) return {};
  // Windows spells the variable Path, and two spellings in one environment confuse the child
  const key = Object.keys(current).find((name) => name.toLowerCase() === "path") ?? "PATH";
  return { [key]: `${texBin}${delimiter}${current[key] ?? ""}` };
}

type Prepared = {
  missing: string[];
  lineMap: LineMap;
  mathFailures: string[];
  citationFallbacks: string[];
  unknownCitations: string[];
  imageIssues: ImageIssue[];
  irIssues: IrIssue[];
  unsupported: string[];
};

/** Writes the project into root, the template folders are linked and the rest of the template is copied. */
function prepare(input: LatexBuildInput, root: string): Prepared {
  const mathFailures: string[] = [];
  const citationFallbacks: string[] = [];
  const unknownCitations: string[] = [];
  const knownCitationKeys = bibliographyKeys(input.bibliography);
  const unsupported: string[] = [];

  for (const name of SHARED) {
    const source = join(input.templateDir, name);
    if (existsSync(source)) symlinkSync(source, join(root, name), "junction");
  }
  for (const name of COPIED) copyFileSync(join(input.templateDir, name), join(root, name));
  // The watermarks of the project are added to this folder, so it is a copy and the template stays as it was
  if (existsSync(join(input.templateDir, "assets"))) copyTree(join(input.templateDir, "assets"), join(root, "assets"));

  const completed = completeConfig(input.config, new Date().toISOString().slice(0, 10));
  writeText(root, "config.yml", completed.text);
  const listLevels = resolveListLevels(completed.lists);
  writeText(root, "marktwain.tex", renderStatementsLatex(resolveStatementStyle(completed.statements, completed.language === "english" ? "en" : "zh"), listLevels));
  for (const file of input.files) writeBytes(root, join("figures", file.path), file.data);
  for (const file of input.watermarkFiles ?? []) writeBytes(root, join("assets/watermarks", file.path), file.data);
  for (const file of input.bibliography) writeBytes(root, join("contents/back", file.path), file.data);
  // gen.lua stops when a file that the settings name is missing, a thesis with no bibliography names the default one and gets an empty file
  if (input.bibliography.length === 0) writeText(root, "contents/back/references.bib", "");

  const parsed = input.documents.map((doc) => ({ doc, json: parseMarkdown(doc.text) }));
  const knownLabels = new Set(parsed.flatMap(({ json, doc }) => collectTargets(json, doc.id).targets.map((t) => t.label)));

  const paths = assignPaths(input.documents, "tex");
  const lineMap: LineMap = new Map();
  // Every document is read first, so an image that is missing or is not an image is known before anything is rendered
  const usedLabels = new Set<string>();
  const irResults = parsed.map(({ doc, json }) => ({ id: doc.id, ...toIr(json, { documentId: doc.id, knownLabels, usedLabels }) }));
  const rendered = irResults.map(({ id, document }) => ({ id, document }));
  const irIssues = irResults.flatMap((result) => result.issues);
  const { issues: imageIssues, replace: imageReplace } = checkImages({ documents: rendered, files: input.files, write: (src, data) => writeBytes(root, join("figures", src), data) });
  for (const { doc } of parsed) {
    const path = paths.get(doc.id) as string;
    const document = (rendered.find((r) => r.id === doc.id) as { document: IrDocument }).document;
    const file = renderLatexFile(document, {
      kind: doc.kind,
      imagePath: (src) => `figures/${imageReplace.get(src) ?? src}`,
      onMathFailure: (latex) => mathFailures.push(latex),
      hasBibliography: input.bibliography.length > 0,
      defaultPlacement: resolvePlacementDefaults(completed.placement),
      onCitationFallback: (keys) => citationFallbacks.push(...keys),
      knownCitationKeys,
      onUnknownCitation: (keys) => unknownCitations.push(...keys),
      onUnsupported: (feature) => unsupported.push(feature),
    });
    writeText(root, path, file.text);
    lineMap.set(path, { documentId: doc.id, blockLines: file.blockLines });
  }
  writeText(root, "main.tex", renderMainLatex(input.documents, paths, input.bibliography.length > 0, input.watermark === true));
  return { missing: completed.missing, lineMap, mathFailures, citationFallbacks, unknownCitations, imageIssues, irIssues, unsupported };
}

function warnings(prepared: Prepared): Diagnostic[] {
  const empty = { file: null, line: null, column: null, source: null };
  return [
    ...prepared.missing.map<Diagnostic>((field) => ({ severity: "warning", code: "config-missing", message: field, ...empty })),
    ...[...new Set(prepared.citationFallbacks)].map<Diagnostic>((key) => ({ severity: "warning", code: "citation-no-bibliography", message: key, ...empty })),
    ...[...new Set(prepared.unknownCitations)].map<Diagnostic>((key) => ({ severity: "warning", code: "citation-unknown", message: key, ...empty })),
    ...prepared.irIssues
      .filter((issue) => issue.code === "broken-ref" || issue.code === "duplicate-label")
      .map<Diagnostic>((issue) => ({ severity: "warning", code: issue.code === "broken-ref" ? "reference-broken" : "label-duplicate", message: issue.detail, file: null, line: null, column: null, source: { documentId: issue.documentId, block: issue.block } })),
    ...prepared.imageIssues.map<Diagnostic>((issue) => ({
      severity: "warning",
      code: issue.reason === "missing" ? "image-missing" : "image-unreadable",
      message: issue.src,
      file: null,
      line: null,
      column: null,
      source: { documentId: issue.documentId, block: issue.block },
    })),
    ...[...new Set(prepared.unsupported)].map<Diagnostic>((feature) => ({ severity: "warning", code: "latex-approximate", message: feature, ...empty })),
  ];
}

/** Builds the thesis PDF from the project documents with the LaTeX template. */
export async function buildLatex(input: LatexBuildInput): Promise<BuildResult> {
  const root = mkdtempSync(join(latexWorkDir(input.workDir), "mt-tex-"));
  const timeout = input.timeoutMs ?? 300_000;
  const env = texEnvironment(input.texBin);
  try {
    const prepared = prepare(input, root);
    const empty = { file: null, line: null, column: null, source: null };
    const diagnostics = warnings(prepared);

    // LaTeX cannot read YAML, so the settings are turned into TeX definitions first
    const gen = await run("texlua", ["scripts/gen.lua"], root, timeout, env, { killTree: true });
    if (gen.code !== 0) {
      diagnostics.push({ severity: "error", message: (gen.stderr || gen.stdout).trim() || `texlua exited with code ${gen.code}`, ...empty });
      return { ok: false, diagnostics, mathFailures: prepared.mathFailures };
    }

    const args = ["-xelatex", "-interaction=nonstopmode", "-halt-on-error", "main.tex"];
    const result = await run("latexmk", args, root, timeout, env, { killTree: true });
    const logPath = join(root, ".tw-thesis-build/aux/main.log");
    const logged = existsSync(logPath) ? parseTexLog(readFileSync(logPath, "utf8"), prepared.lineMap) : [];
    diagnostics.push(...logged);

    if (result.code === 0 && existsSync(join(root, "main.pdf"))) {
      return { ok: true, pdf: readFileSync(join(root, "main.pdf")), pages: [], diagnostics, mathFailures: prepared.mathFailures, anchors: [] };
    }
    if (!diagnostics.some((d) => d.severity === "error")) {
      diagnostics.push({ severity: "error", message: (result.stderr || result.stdout).trim() || `latexmk exited with code ${result.code}`, ...empty });
    }
    return { ok: false, diagnostics, mathFailures: prepared.mathFailures };
  } finally {
    if (!input.keep) {
      try {
        rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      } catch {
        // The folder is in the temporary folder and goes with it
      }
    }
  }
}

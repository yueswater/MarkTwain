import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { collectTargets, parseMarkdown, resolveListLevels, resolvePlacementDefaults, resolveStatementStyle } from "@marktwain/schema";
import { renderStatementsTypst, renderTypstFile, toIr, type IrDocument, type IrIssue } from "@marktwain/render";
import { bibliographyKeys } from "./bibliography-keys";
import { completeConfig } from "./config";
import { checkImages, type ImageIssue } from "./images";
import { isHarmless, parseDiagnostics, type LineMap } from "./diagnostics";
import { assignPaths, renderMain } from "./layout";
import { copyTree, run, writeBytes, writeText } from "./process";
import type { Anchor, BuildInput, BuildResult, Diagnostic } from "./types";

export { run };

/** Template folders shared by symlink. figures and contents are written per build. */
const SHARED = ["lib", "helper", "assets", "schools", "fonts", "misc", "i18n"];

/** Arguments that make typst read packages from the bundled folder, so nothing is downloaded. */
export function packageArgs(packageCachePath: string | undefined): string[] {
  return packageCachePath ? ["--package-cache-path", packageCachePath] : [];
}

type Prepared = {
  /** Folder of the project fonts inside the build directory, null when the project has none */
  projectFontsDir: string | null;
  missing: string[];
  lineMap: LineMap;
  mathFailures: string[];
  citationFallbacks: string[];
  unknownCitations: string[];
  imageIssues: ImageIssue[];
  irIssues: IrIssue[];
};

/** Template entries that never belong in a generated project. */
const NOT_COPIED = new Set([".git", ".github", ".gitignore", ".marktwain-template.json", "docs", "tests", "contents", "figures", "node_modules", "config.yml", "main.typ", "main.en.typ", "main.pdf", "main.en.pdf"]);

/**
 * Writes config, contents, figures and main.typ into root.
 * With link the template folders are linked, otherwise the whole template is copied.
 */
function prepare(input: BuildInput, root: string, link: boolean): Prepared {
  const mathFailures: string[] = [];
  const citationFallbacks: string[] = [];
  const unknownCitations: string[] = [];
  const knownCitationKeys = bibliographyKeys(input.bibliography);

  // A project font goes in a folder of its own, beside the linked template, or into the fonts folder of an exported project
  const projectFontsDir = (input.projectFonts ?? []).length > 0 ? (link ? "project-fonts" : join("fonts", "project")) : null;

  if (link) {
    // Junctions need no privileges on Windows and behave as symlinks elsewhere.
    for (const name of SHARED) {
      const source = join(input.templateDir, name);
      if (existsSync(source)) symlinkSync(source, join(root, name), "junction");
    }
  } else {
    for (const name of readdirSync(input.templateDir)) {
      if (NOT_COPIED.has(name)) continue;
      copyTree(join(input.templateDir, name), join(root, name));
    }
  }

  for (const font of input.projectFonts ?? []) {
    const target = join(root, projectFontsDir as string, font.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, font.data);
  }

  const completed = completeConfig(input.config, new Date().toISOString().slice(0, 10));
  writeText(root, "config.yml", completed.text);
  const listLevels = resolveListLevels(completed.lists);
  writeText(root, "marktwain.typ", renderStatementsTypst(resolveStatementStyle(completed.statements, completed.language === "english" ? "en" : "zh"), listLevels));
  for (const file of input.files) {
    const target = join(root, "figures", file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.data);
  }
  for (const file of input.watermarkFiles ?? []) {
    const target = join(root, "assets/watermarks", file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.data);
  }
  for (const file of input.bibliography) {
    const target = join(root, "contents/back", file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.data);
  }

  // Labels defined anywhere in the project, so references to missing targets degrade to text.
  const parsed = input.documents.map((doc) => ({ doc, json: parseMarkdown(doc.text) }));
  const knownLabels = new Set(parsed.flatMap(({ json, doc }) => collectTargets(json, doc.id).targets.map((t) => t.label)));

  const paths = assignPaths(input.documents);
  const lineMap: LineMap = new Map();
  let firstAppendix = true;
  // Every document is read first, so an image that is missing or is not an image is known before anything is rendered
  const usedLabels = new Set<string>();
  const irResults = parsed.map(({ doc, json }) => ({ id: doc.id, ...toIr(json, { documentId: doc.id, knownLabels, usedLabels }) }));
  const rendered = irResults.map(({ id, document }) => ({ id, document }));
  const irIssues = irResults.flatMap((result) => result.issues);
  const { issues: imageIssues, replace: imageReplace } = checkImages({ documents: rendered, files: input.files, write: (src, data) => writeBytes(root, join("figures", src), data) });
  for (const { doc } of parsed) {
    const path = paths.get(doc.id) as string;
    const document = (rendered.find((r) => r.id === doc.id) as { document: IrDocument }).document;
    const file = renderTypstFile(document, {
      kind: doc.kind,
      firstAppendix: doc.kind === "appendix" ? firstAppendix : undefined,
      imagePath: (src) => `/figures/${imageReplace.get(src) ?? src}`,
      onMathFailure: (latex) => mathFailures.push(latex),
      hasBibliography: input.bibliography.length > 0,
      anchors: input.anchors,
      defaultPlacement: resolvePlacementDefaults(completed.placement),
      onCitationFallback: (keys) => citationFallbacks.push(...keys),
      knownCitationKeys,
      onUnknownCitation: (keys) => unknownCitations.push(...keys),
    });
    if (doc.kind === "appendix") firstAppendix = false;
    writeText(root, path, file.text);
    lineMap.set(path, { documentId: doc.id, blockLines: file.blockLines });
  }
  writeText(root, "main.typ", renderMain(input.documents, paths, input.bibliography.length > 0, { ordered: listLevels.ordered !== null, bullet: listLevels.bullet !== null }));
  return { projectFontsDir, missing: completed.missing, lineMap, mathFailures, citationFallbacks, unknownCitations, imageIssues, irIssues };
}

function warnings(prepared: Prepared): Diagnostic[] {
  const empty = { file: null, line: null, column: null, source: null };
  return [
    ...prepared.missing.map<Diagnostic>((field) => ({ severity: "warning", code: "config-missing", message: field, ...empty })),
    ...[...new Set(prepared.citationFallbacks)].map<Diagnostic>((key) => ({
      severity: "warning",
      code: "citation-no-bibliography",
      message: key,
      ...empty,
    })),
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
  ];
}

/** Reads the markers back from the same project, a failure only means the preview cannot follow the editor. */
async function readAnchors(input: BuildInput, root: string, fontArgs: string[]): Promise<Anchor[]> {
  const options = [...fontArgs, ...packageArgs(input.packageCachePath), ...(input.watermark ? ["--input", "watermark=true"] : [])];
  // Newer typst moved query to eval, so the old form is tried first and then the new one
  const attempts = [
    ["query", "main.typ", "<mtpos>", "--field", "value", ...options],
    ["eval", "query(<mtpos>).map(it => it.value)", "--in", "main.typ", ...options],
  ];
  for (const args of attempts) {
    const out = await run(input.typst, args, root, input.timeoutMs ?? 120_000, input.env);
    if (out.code !== 0) continue;
    try {
      const values = JSON.parse(out.stdout) as Partial<Anchor>[];
      return values.flatMap((v) => (typeof v.id === "string" && typeof v.page === "number" && typeof v.y === "number" ? [{ id: v.id, page: v.page, y: v.y }] : []));
    } catch {
      // Try the other form of the command
    }
  }
  return [];
}

/** Builds the thesis PDF from the project documents with the Typst template. */
export async function buildTypst(input: BuildInput): Promise<BuildResult> {
  const root = mkdtempSync(join(input.workDir, "mt-build-"));
  // The query for the anchors runs beside the compile and may still be running when the compile has failed
  let anchorsRunning: Promise<unknown> = Promise.resolve();
  try {
    const prepared = prepare(input, root, true);
    const fonts = join(input.templateDir, "fonts");
    const png = input.format === "png";
    const output = png ? "page-{0p}.png" : "out.pdf";
    // The fonts of the project come first, so one that has the name of a font of the template is used instead of it
    const fontArgs = [...(prepared.projectFontsDir ? ["--font-path", prepared.projectFontsDir] : []), "--font-path", fonts];
    const anchorsTask = input.anchors && !png ? readAnchors(input, root, fontArgs) : Promise.resolve<Anchor[]>([]);
    anchorsRunning = anchorsTask.catch(() => undefined);
    const { code, stderr } = await run(
      input.typst,
      [
        "compile",
        "main.typ",
        output,
        ...(png ? ["--format", "png", "--ppi", String(input.ppi ?? 110)] : []),
        ...fontArgs,
        ...packageArgs(input.packageCachePath),
        ...(input.watermark ? ["--input", "watermark=true"] : []),
        "--diagnostic-format",
        "human",
      ],
      root,
      input.timeoutMs ?? 120_000,
      input.env,
    );
    const diagnostics = [...warnings(prepared), ...parseDiagnostics(stderr, prepared.lineMap, root)].filter((d) => !isHarmless(d));
    const mathFailures = prepared.mathFailures;
    if (code === 0 && png) {
      const pages = readdirSync(root)
        .filter((name) => /^page-\d+\.png$/.test(name))
        .sort()
        .map((name) => readFileSync(join(root, name)));
      if (pages.length > 0) return { ok: true, pdf: new Uint8Array(), pages, diagnostics, mathFailures, anchors: [] };
    }
    if (code === 0 && !png && existsSync(join(root, "out.pdf"))) {
      return { ok: true, pdf: readFileSync(join(root, "out.pdf")), pages: [], diagnostics, mathFailures, anchors: await anchorsTask };
    }
    if (!diagnostics.some((d) => d.severity === "error")) {
      diagnostics.push({
        severity: "error",
        message: stderr.trim() || `typst exited with code ${code}`,
        file: null,
        line: null,
        column: null,
        source: null,
      });
    }
    return { ok: false, diagnostics, mathFailures };
  } finally {
    // A process that still has a file open keeps Windows from deleting the folder, so it is waited for first, and a folder that cannot be deleted is not an error of the build
    await anchorsRunning;
    if (!input.keep) {
      try {
        rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      } catch {
        // The folder is in the temporary folder and goes with it
      }
    }
  }
}

/**
 * Writes the complete Typst project, template included, into a new folder.
 * It compiles on its own with `typst compile main.typ`, no MarkTwain needed.
 */
export function exportTypstProject(input: BuildInput, destination: string): { diagnostics: Diagnostic[]; mathFailures: string[] } {
  if (existsSync(destination) && readdirSync(destination).length > 0) {
    throw new Error(`${basename(destination)} is not empty`);
  }
  mkdirSync(destination, { recursive: true });
  const prepared = prepare(input, destination, false);
  return { diagnostics: warnings(prepared), mathFailures: prepared.mathFailures };
}

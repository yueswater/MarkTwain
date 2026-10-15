import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, statSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { collectTargets, parseMarkdown, resolveListLevels, resolvePlacementDefaults, resolveStatementStyle } from "@marktwain/schema";
import { renderStatementsTypst, renderTypstFile, toIr } from "@marktwain/render";
import { completeConfig } from "./config";
import { parseDiagnostics, type LineMap } from "./diagnostics";
import { assignPaths, renderMain } from "./layout";
import type { Anchor, BuildInput, BuildResult, Diagnostic } from "./types";

/** Template folders shared by symlink. figures and contents are written per build. */
const SHARED = ["lib", "helper", "assets", "schools", "fonts", "misc", "i18n"];

function writeText(root: string, path: string, text: string): void {
  const full = join(root, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, text);
}

export function run(command: string, args: string[], cwd: string, timeoutMs: number): Promise<{ code: number | null; stderr: string; stdout: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, windowsHide: true });
    let stderr = "";
    let stdout = "";
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf8")));
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ code: null, stderr: `error: ${error.message}`, stdout });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stderr, stdout });
    });
  });
}

/** Copies a file or folder, following links. fs.cpSync skipped folders on the Windows runner, so this walks the tree. */
function copyTree(source: string, destination: string): void {
  if (statSync(source).isDirectory()) {
    mkdirSync(destination, { recursive: true });
    for (const name of readdirSync(source)) copyTree(join(source, name), join(destination, name));
  } else {
    copyFileSync(source, destination);
  }
}

type Prepared = {
  missing: string[];
  lineMap: LineMap;
  mathFailures: string[];
  citationFallbacks: string[];
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
  for (const { doc, json } of parsed) {
    const path = paths.get(doc.id) as string;
    const { document } = toIr(json, { documentId: doc.id, knownLabels });
    const file = renderTypstFile(document, {
      kind: doc.kind,
      firstAppendix: doc.kind === "appendix" ? firstAppendix : undefined,
      imagePath: (src) => `/figures/${src}`,
      onMathFailure: (latex) => mathFailures.push(latex),
      hasBibliography: input.bibliography.length > 0,
      anchors: input.anchors,
      defaultPlacement: resolvePlacementDefaults(completed.placement),
      onCitationFallback: (keys) => citationFallbacks.push(...keys),
    });
    if (doc.kind === "appendix") firstAppendix = false;
    writeText(root, path, file.text);
    lineMap.set(path, { documentId: doc.id, blockLines: file.blockLines });
  }
  writeText(root, "main.typ", renderMain(input.documents, paths, input.bibliography.length > 0, { ordered: listLevels.ordered !== null, bullet: listLevels.bullet !== null }));
  return { missing: completed.missing, lineMap, mathFailures, citationFallbacks };
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
  ];
}

/** Reads the markers back from the same project, a failure only means the preview cannot follow the editor. */
async function readAnchors(input: BuildInput, root: string, fonts: string): Promise<Anchor[]> {
  const options = ["--font-path", fonts, ...(input.watermark ? ["--input", "watermark=true"] : [])];
  // Newer typst moved query to eval, so the old form is tried first and then the new one
  const attempts = [
    ["query", "main.typ", "<mtpos>", "--field", "value", ...options],
    ["eval", "query(<mtpos>).map(it => it.value)", "--in", "main.typ", ...options],
  ];
  for (const args of attempts) {
    const out = await run(input.typst, args, root, input.timeoutMs ?? 120_000);
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
  try {
    const prepared = prepare(input, root, true);
    const fonts = join(input.templateDir, "fonts");
    const png = input.format === "png";
    const output = png ? "page-{0p}.png" : "out.pdf";
    const anchorsTask = input.anchors && !png ? readAnchors(input, root, fonts) : Promise.resolve<Anchor[]>([]);
    const { code, stderr } = await run(
      input.typst,
      [
        "compile",
        "main.typ",
        output,
        ...(png ? ["--format", "png", "--ppi", String(input.ppi ?? 110)] : []),
        "--font-path",
        fonts,
        ...(input.watermark ? ["--input", "watermark=true"] : []),
        "--diagnostic-format",
        "human",
      ],
      root,
      input.timeoutMs ?? 120_000,
    );
    const diagnostics = [...warnings(prepared), ...parseDiagnostics(stderr, prepared.lineMap, root)];
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
    if (!input.keep) rmSync(root, { recursive: true, force: true });
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

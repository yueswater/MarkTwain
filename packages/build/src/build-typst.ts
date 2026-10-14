import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { collectTargets, parseMarkdown } from "@marktwain/schema";
import { renderTypstFile, toIr } from "@marktwain/render";
import { completeConfig } from "./config";
import { parseDiagnostics, type LineMap } from "./diagnostics";
import { assignPaths, renderMain } from "./layout";
import type { BuildInput, BuildResult, Diagnostic } from "./types";

/** Template folders shared by symlink. figures and contents are written per build. */
const SHARED = ["lib", "helper", "assets", "schools", "fonts", "misc", "i18n"];

function writeText(root: string, path: string, text: string): void {
  const full = join(root, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, text);
}

function run(command: string, args: string[], cwd: string, timeoutMs: number): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ code: null, stderr: `error: ${error.message}` });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stderr });
    });
  });
}

/** Builds the thesis PDF from the project documents with the Typst template. */
export async function buildTypst(input: BuildInput): Promise<BuildResult> {
  const root = mkdtempSync(join(input.workDir, "mt-build-"));
  const mathFailures: string[] = [];
  const citationFallbacks: string[] = [];
  try {
    // Junctions need no privileges on Windows and behave as symlinks elsewhere.
    for (const name of SHARED) {
      const source = join(input.templateDir, name);
      if (existsSync(source)) symlinkSync(source, join(root, name), "junction");
    }
    const completed = completeConfig(input.config, new Date().toISOString().slice(0, 10));
    writeText(root, "config.yml", completed.text);
    for (const file of input.files) {
      const target = join(root, "figures", file.path);
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
        onCitationFallback: (keys) => citationFallbacks.push(...keys),
      });
      if (doc.kind === "appendix") firstAppendix = false;
      writeText(root, path, file.text);
      lineMap.set(path, { documentId: doc.id, blockLines: file.blockLines });
    }
    writeText(root, "main.typ", renderMain(input.documents, paths, input.bibliography.length > 0));

    const fonts = join(input.templateDir, "fonts");
    const { code, stderr } = await run(
      input.typst,
      ["compile", "main.typ", "out.pdf", "--font-path", fonts, "--diagnostic-format", "human"],
      root,
      input.timeoutMs ?? 120_000,
    );
    const diagnostics = [
      ...completed.missing.map<Diagnostic>((field) => ({
        severity: "warning",
        code: "config-missing",
        message: field,
        file: null,
        line: null,
        column: null,
        source: null,
      })),
      ...[...new Set(citationFallbacks)].map<Diagnostic>((key) => ({
        severity: "warning",
        code: "citation-no-bibliography",
        message: key,
        file: null,
        line: null,
        column: null,
        source: null,
      })),
      ...parseDiagnostics(stderr, lineMap, root),
    ];
    if (code === 0 && existsSync(join(root, "out.pdf"))) {
      return { ok: true, pdf: readFileSync(join(root, "out.pdf")), diagnostics, mathFailures };
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

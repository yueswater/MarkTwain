import { describe, expect, it } from "@jest/globals";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { buildLatex, exportLatexProject, texEnvironment } from "./build-latex";
import { buildTypst, exportTypstProject } from "./build-typst";
import { PNG, SAMPLE_CONFIG, SAMPLE_DOCUMENTS } from "./fixtures";

/**
 * The exported project is the thesis that MarkTwain builds, taken out of MarkTwain: unpacked and compiled with the commands of the
 * template alone, it gives the same pages.
 */

const typstTemplate = resolve(__dirname, "../../../resources/templates/typ");
const texTemplate = resolve(__dirname, "../../../resources/templates/tex");

function typstPath(): string | null {
  const configured = process.env.MARKTWAIN_TYPST ?? "typst";
  try {
    execFileSync(configured, ["--version"], { stdio: "ignore" });
    return configured;
  } catch {
    return null;
  }
}

function texBinPath(): string | null {
  const configured = process.env.MARKTWAIN_TEX_BIN;
  if (configured) return configured;
  try {
    const found = execFileSync(process.platform === "win32" ? "where" : "which", ["xelatex"], { encoding: "utf8" }).split(/\r?\n/)[0];
    return found ? dirname(found) : null;
  } catch {
    return null;
  }
}

const sha = (data: Uint8Array | Buffer) => createHash("sha256").update(data).digest("hex");
const typst = typstPath();
const texBin = texBinPath();

(typst && existsSync(typstTemplate) ? describe : describe.skip)("the exported Typst project", () => {
  it("compiled with plain typst gives the same pages as the build of MarkTwain", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 對照 "));
    const input = { templateDir: typstTemplate, workDir: work, typst: typst as string, config: SAMPLE_CONFIG, documents: SAMPLE_DOCUMENTS, files: [{ path: "images/a.png", data: PNG }], bibliography: [] };
    try {
      const built = await buildTypst({ ...input, format: "png", ppi: 110 });
      if (!built.ok) throw new Error(built.diagnostics.map((d) => d.message).join("\n"));
      const folder = join(work, "專案");
      exportTypstProject(input, folder);
      // The command of the template, with the fonts that it brings
      execFileSync(typst as string, ["compile", "main.typ", "page-{0p}.png", "--format", "png", "--ppi", "110", "--font-path", "fonts"], { cwd: folder, stdio: "ignore" });
      const pages = readdirSync(folder).filter((name) => /^page-\d+\.png$/.test(name)).sort();
      expect(built.pages.length).toBeGreaterThan(1);
      expect(pages).toHaveLength(built.pages.length);
      expect(pages.map((name) => sha(readFileSync(join(folder, name))))).toEqual(built.pages.map((page) => sha(page)));
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }, 180_000);
});

(texBin && existsSync(texTemplate) ? describe : describe.skip)("the exported LaTeX project", () => {
  it("built with the commands of the template gives the same PDF as the build of MarkTwain", async () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain tex 對照 "));
    // A fixed date, so that two builds of the same thesis are the same bytes
    const fixed = { SOURCE_DATE_EPOCH: "1700000000", FORCE_SOURCE_DATE: "1" };
    const saved = { ...process.env };
    Object.assign(process.env, fixed);
    const input = { templateDir: texTemplate, workDir: work, texBin, config: SAMPLE_CONFIG, documents: SAMPLE_DOCUMENTS, files: [{ path: "images/a.png", data: PNG }], bibliography: [] };
    try {
      const built = await buildLatex(input);
      if (!built.ok) throw new Error(built.diagnostics.map((d) => d.message).join("\n"));
      const folder = join(work, "專案");
      exportLatexProject(input, folder);
      const env = { ...process.env, ...texEnvironment(texBin) };
      const path = Object.keys(env).find((name) => name.toLowerCase() === "path") ?? "PATH";
      env[path] = `${texBin}${delimiter}${process.env[path] ?? ""}`;
      // The two commands of the template
      execFileSync("texlua", ["scripts/gen.lua"], { cwd: folder, env, stdio: "ignore" });
      execFileSync("latexmk", ["-xelatex", "-interaction=nonstopmode", "-halt-on-error", "main.tex"], { cwd: folder, env, stdio: "ignore" });
      const exported = readFileSync(join(folder, "main.pdf"));
      expect(sha(exported)).toBe(sha(built.pdf));
    } finally {
      process.env = saved;
      rmSync(work, { recursive: true, force: true });
    }
  }, 600_000);
});

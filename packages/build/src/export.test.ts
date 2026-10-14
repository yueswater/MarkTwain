import { describe, expect, it } from "@jest/globals";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { exportTypstProject } from "./build-typst";
import { PNG, SAMPLE_CONFIG, SAMPLE_DOCUMENTS } from "./fixtures";

const templateDir = resolve(__dirname, "../../../resources/templates/typ");

function typstPath(): string | null {
  const configured = process.env.MARKTWAIN_TYPST ?? "typst";
  try {
    execFileSync(configured, ["--version"], { stdio: "ignore" });
    return configured;
  } catch {
    return null;
  }
}

const typst = typstPath();
const maybe = typst && existsSync(templateDir) ? describe : describe.skip;

maybe("exportTypstProject", () => {
  it("writes a self contained project that compiles with plain typst", () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 匯出 "));
    const dest = join(work, "我的論文");
    try {
      exportTypstProject(
        {
          templateDir,
          workDir: work,
          typst: typst as string,
          config: SAMPLE_CONFIG,
          documents: SAMPLE_DOCUMENTS,
          files: [{ path: "images/a.png", data: PNG }],
          bibliography: [],
        },
        dest,
      );
      const entries = readdirSync(dest);
      const missing = ["main.typ", "config.yml", "contents", "figures", "lib", "helper", "fonts", "LICENSE"].filter((name) => !entries.includes(name));
      if (missing.length > 0) throw new Error(JSON.stringify({ missing, entries, template: readdirSync(templateDir) }));
      expect(missing).toEqual([]);
      expect(entries).not.toContain("docs");
      expect(readFileSync(join(dest, "contents/chapter01.typ"), "utf8")).toContain("= 緒論 <cha:intro>");
      execFileSync(typst as string, ["compile", "main.typ", "out.pdf", "--font-path", "fonts"], { cwd: dest, stdio: "ignore" });
      expect(existsSync(join(dest, "out.pdf"))).toBe(true);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }, 120_000);

  it("refuses a destination that already has files", () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 匯出 "));
    try {
      writeFileSync(join(work, "keep.txt"), "x");
      expect(() =>
        exportTypstProject(
          { templateDir, workDir: work, typst: typst as string, config: "", documents: [], files: [], bibliography: [] },
          work,
        ),
      ).toThrow("not empty");
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });
});

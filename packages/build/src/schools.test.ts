import { describe, expect, it } from "@jest/globals";
import { SCHOOLS } from "@marktwain/schema";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildTypst } from "./build-typst";
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

// Done when: a sample thesis builds a PDF for every supported school
maybe("every school preset", () => {
  for (const school of SCHOOLS) {
    it(`${school.code} builds the sample thesis`, async () => {
      const work = mkdtempSync(join(tmpdir(), "marktwain 學校 "));
      try {
        const result = await buildTypst({
          templateDir,
          workDir: work,
          typst: typst as string,
          config: `${SAMPLE_CONFIG}\nschool: ${school.code}\n`,
          documents: SAMPLE_DOCUMENTS,
          files: [{ path: "images/a.png", data: PNG }],
          bibliography: [],
        });
        expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
        expect(result.ok).toBe(true);
      } finally {
        rmSync(work, { recursive: true, force: true });
      }
    }, 120_000);
  }
});

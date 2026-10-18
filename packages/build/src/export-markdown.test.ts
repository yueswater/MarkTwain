import { describe, expect, it } from "@jest/globals";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportMarkdownProject } from "./export-markdown";
import { PNG, SAMPLE_CONFIG, SAMPLE_DOCUMENTS } from "./fixtures";

function withFolder(run: (folder: string) => void): void {
  const work = mkdtempSync(join(tmpdir(), "marktwain 原稿 "));
  try {
    run(join(work, "我的論文"));
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

describe("exportMarkdownProject", () => {
  it("writes a file for each document in the order of the thesis, with the images, the bibliography and the settings beside them", () => {
    withFolder((folder) => {
      const { files } = exportMarkdownProject(
        { documents: SAMPLE_DOCUMENTS, files: [{ path: "images/a.png", data: PNG }], bibliography: [{ path: "references.bib", data: Buffer.from("@book{a, title={B}}") }], config: SAMPLE_CONFIG },
        folder,
      );
      expect(files.filter((name) => name.endsWith(".md"))).toEqual(["acknowledgement.md", "abstract.md", "denotation.md", "chapter01.md", "chapter02.md", "appendix01.md"]);
      expect(readdirSync(folder)).toEqual(expect.arrayContaining(["abstract.md", "chapter01.md", "config.yml", "references.bib", "images"]));
      expect(readFileSync(join(folder, "chapter01.md"), "utf8")).toBe(SAMPLE_DOCUMENTS.find((doc) => doc.id === "c1")?.text);
      expect(readFileSync(join(folder, "images/a.png")).equals(PNG)).toBe(true);
      expect(readFileSync(join(folder, "config.yml"), "utf8")).toBe(SAMPLE_CONFIG);
      expect(readFileSync(join(folder, "references.bib"), "utf8")).toContain("@book");
    });
  });

  it("numbers the chapters and the appendices from one, and names the other kinds", () => {
    withFolder((folder) => {
      const documents = [
        { id: "1", kind: "abstractEn" as const, text: "a" },
        { id: "2", kind: "chapter" as const, text: "b" },
        { id: "3", kind: "chapter" as const, text: "c" },
        { id: "4", kind: "appendix" as const, text: "d" },
        { id: "5", kind: "appendix" as const, text: "e" },
      ];
      const { files } = exportMarkdownProject({ documents, files: [], bibliography: [], config: "" }, folder);
      expect(files).toEqual(["abstract-en.md", "chapter01.md", "chapter02.md", "appendix01.md", "appendix02.md", "config.yml"]);
    });
  });

  it("refuses a folder that already has files", () => {
    const work = mkdtempSync(join(tmpdir(), "marktwain 原稿 "));
    try {
      writeFileSync(join(work, "keep.txt"), "x");
      expect(() => exportMarkdownProject({ documents: [], files: [], bibliography: [], config: "" }, work)).toThrow("not empty");
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });
});

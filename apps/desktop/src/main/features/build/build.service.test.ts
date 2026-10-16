import { beforeEach, describe, expect, it } from "@jest/globals";
import type { BuildInput, BuildResult } from "@marktwain/build";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSession } from "../../core/database-session";
import { AppError } from "../../core/errors";
import { openDatabase } from "../../infra/db";
import { migrate } from "../../infra/migrate";
import { MIGRATIONS } from "../../infra/migrations";
import { AssetRepository } from "../asset/asset.repository";
import { ConfigService } from "../config/config.service";
import { DocumentService } from "../document/document.service";
import { ProjectRepository } from "../project/project.repository";
import { BuildService, pageCountOf } from "./build.service";

let documents: DocumentService;
let session: DatabaseSession;
let config: ConfigService;
let templateDir: string;
let seen: BuildInput[];

function service(result: BuildResult | (() => Promise<BuildResult>)) {
  return new BuildService(
    session,
    documents,
    config,
    () => ({ typst: "typst", templateDir }),
    async (input) => {
      seen.push(input);
      return typeof result === "function" ? result() : result;
    },
  );
}

beforeEach(() => {
  const db = openDatabase(":memory:");
  migrate(db, MIGRATIONS);
  new ProjectRepository(db).insert("我的論文", "typst", 0);
  session = new DatabaseSession();
  session.open(db, ":memory:");
  let n = 0;
  documents = new DocumentService(session, () => `id-${++n}`, () => new Date(0));
  documents.seedDefaults();
  documents.save("id-2", "# 緒論\n");
  new AssetRepository(db).put("images/a.png", new Uint8Array([1]), 0);
  config = new ConfigService(session);
  templateDir = mkdtempSync(join(tmpdir(), "mt-template "));
  seen = [];
});

const code = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
  } catch (e) {
    return e instanceof AppError ? e.code : "other";
  }
};

describe("BuildService", () => {
  it("passes documents, images and config to the builder and returns a preview URL", async () => {
    const outcome = await service({ ok: true, pdf: new TextEncoder().encode("<< /Type /Pages /Count 3 >>"), pages: [], diagnostics: [], mathFailures: ["x"], anchors: [{ id: "id-2:0", page: 2, y: 40 }] }).build();
    expect(outcome).toEqual({ ok: true, diagnostics: [], mathFailures: ["x"], pageCount: 3, revision: 1, anchors: [{ id: "id-2:0", page: 2, y: 40 }] });
    expect(seen[0]?.anchors).toBe(true);
    expect(seen[0]?.format).toBe("pdf");
    expect(seen[0]?.documents.map((d) => [d.kind, d.text])).toEqual([["abstract", ""], ["chapter", "# 緒論\n"]]);
    expect(seen[0]?.files.map((f) => f.path)).toEqual(["images/a.png"]);
    expect(seen[0]?.config).toContain("title: 我的論文");
  });

  it("hands the typst path and the package folder of the paths to the builder", async () => {
    const s = new BuildService(session, documents, config, () => ({ typst: "/r/typst", templateDir, packageCachePath: "/r/typst-packages" }), async (input) => {
      seen.push(input);
      return { ok: true, pdf: new Uint8Array(), pages: [], diagnostics: [], mathFailures: [], anchors: [] };
    });
    await s.build();
    expect(seen[0]).toMatchObject({ typst: "/r/typst", packageCachePath: "/r/typst-packages" });
  });

  it("keeps the latest PDF and bumps the revision on each success", async () => {
    const s = service({ ok: true, pdf: new Uint8Array([1, 2]), pages: [], diagnostics: [], mathFailures: [], anchors: [] });
    expect(s.latestPdf()).toBeNull();
    await s.build();
    expect((await s.build()).revision).toBe(2);
    expect([...(s.latestPdf() ?? [])]).toEqual([1, 2]);
  });

  it("counts the pages from the page tree, the largest count is the root", () => {
    expect(pageCountOf(new TextEncoder().encode("/Count 2 /Kids [] /Count 7 /Count 3"))).toBe(7);
    expect(pageCountOf(new Uint8Array())).toBe(0);
  });

  it("returns diagnostics for a failed build without a preview", async () => {
    const outcome = await service({
      ok: false,
      diagnostics: [{ severity: "error", message: "boom", file: "contents/chapter01.typ", line: 3, column: 1, source: { documentId: "id-2", block: 0 } }],
      mathFailures: [],
    }).build();
    expect(outcome.ok).toBe(false);
    expect(outcome.pageCount).toBe(0);
    expect(outcome.diagnostics[0]).toMatchObject({ message: "boom", code: null, source: { documentId: "id-2", block: 0 } });
  });

  it("rejects a second build while one is running", async () => {
    let release!: (r: BuildResult) => void;
    const done: BuildResult = { ok: true, pdf: new Uint8Array(), pages: [], diagnostics: [], mathFailures: [], anchors: [] };
    const s = service(() => new Promise<BuildResult>((r) => (release = r)));
    const first = s.build();
    expect(await code(() => s.build())).toBe("build.busy");
    release(done);
    await first;
    const second = s.build();
    release(done);
    await expect(second).resolves.toMatchObject({ ok: true });
  });

  it("reports a missing template or missing typst", async () => {
    const missing = new BuildService(session, documents, config, () => ({ typst: "typst", templateDir: "/nonexistent/x" }));
    expect(await code(() => missing.build())).toBe("build.template-missing");
    const noTypst = service({ ok: false, diagnostics: [{ severity: "error", message: "spawn typst ENOENT", file: null, line: null, column: null, source: null }], mathFailures: [] });
    expect(await code(() => noTypst.build())).toBe("build.typst-missing");
  });

  describe("export", () => {
    it("builds the PDF at export time and saves it, failing with the first error", async () => {
      const target = join(templateDir, "out.pdf");
      await service({ ok: true, pdf: new Uint8Array([7, 8]), pages: [], diagnostics: [], mathFailures: [], anchors: [] }).savePdf(target);
      expect([...readFileSync(target)]).toEqual([7, 8]);
      const failing = service({ ok: false, diagnostics: [{ severity: "error", message: "boom", file: null, line: null, column: null, source: null }], mathFailures: [] });
      expect(await code(() => failing.savePdf(target))).toBe("export.failed");
      expect(seen.at(-1)?.format).toBe("pdf");
    });

    it("exports the project into a folder named after the title", () => {
      const calls: string[] = [];
      const s = new BuildService(session, documents, config, () => ({ typst: "typst", templateDir }), undefined, undefined, (_input, destination) => {
        calls.push(destination);
        return { diagnostics: [], mathFailures: [], anchors: [] };
      });
      expect(s.exportProject("/parent")).toBe(join("/parent", "我的論文-typst"));
      expect(calls).toEqual([join("/parent", "我的論文-typst")]);
    });

    it("wraps exporter failures in a coded error", async () => {
      const s = new BuildService(session, documents, config, () => ({ typst: "typst", templateDir }), undefined, undefined, () => {
        throw new Error("not empty");
      });
      expect(await code(async () => s.exportProject("/parent"))).toBe("export.failed");
    });
  });
});

describe("BuildService with a project written for LaTeX", () => {
  const ok: BuildResult = { ok: true, pdf: new Uint8Array([7]), pages: [], diagnostics: [], mathFailures: [], anchors: [] };

  function latexService(tex: { bin: string | null; templateDir: string } | undefined) {
    session.db.run("UPDATE project SET engine = 'latex'");
    const latexSeen: unknown[] = [];
    const s = new BuildService(
      session,
      documents,
      config,
      () => ({ typst: "typst", templateDir, tex }),
      async () => {
        throw new Error("the Typst builder must not run");
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      async (input) => {
        latexSeen.push(input);
        return ok;
      },
    );
    return { s, latexSeen };
  }

  it("builds with the LaTeX builder and the template and TeX Live of the LaTeX side", async () => {
    const { s, latexSeen } = latexService({ bin: "/tex/bin", templateDir });
    const outcome = await s.build();
    expect(outcome.ok).toBe(true);
    expect(latexSeen[0]).toMatchObject({ templateDir, texBin: "/tex/bin", watermark: false });
    expect([...(s.latestPdf() ?? [])]).toEqual([7]);
  });

  it("tells that LaTeX is missing before it builds anything", async () => {
    expect(await code(() => latexService({ bin: null, templateDir }).s.build())).toBe("build.tex-missing");
    expect(await code(() => latexService(undefined).s.build())).toBe("build.tex-missing");
  });

  it("exports the PDF with the same builder and refuses the folder of a Typst project", async () => {
    const { s, latexSeen } = latexService({ bin: "/tex/bin", templateDir });
    const out = join(mkdtempSync(join(tmpdir(), "mt-out ")), "a.pdf");
    await s.savePdf(out, true);
    expect(latexSeen[0]).toMatchObject({ watermark: true });
    expect([...readFileSync(out)]).toEqual([7]);
    expect(() => s.exportProject(tmpdir())).toThrow(AppError);
  });
});

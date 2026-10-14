import { beforeEach, describe, expect, it } from "@jest/globals";
import type { BuildInput, BuildResult } from "@marktwain/build";
import { mkdtempSync } from "node:fs";
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
import { BuildService } from "./build.service";

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
  new ProjectRepository(db).insert("我的論文", 0);
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
    const outcome = await service({ ok: true, pdf: new Uint8Array([37, 80]), diagnostics: [], mathFailures: ["x"] }).build();
    expect(outcome).toEqual({ ok: true, diagnostics: [], mathFailures: ["x"], previewUrl: "marktwain-preview://pdf/1.pdf" });
    expect(seen[0]?.documents.map((d) => [d.kind, d.text])).toEqual([["abstract", ""], ["chapter", "# 緒論\n"]]);
    expect(seen[0]?.files.map((f) => f.path)).toEqual(["images/a.png"]);
    expect(seen[0]?.config).toContain("title: 我的論文");
  });

  it("keeps the latest PDF and bumps the revision on each success", async () => {
    const s = service({ ok: true, pdf: new Uint8Array([1, 2]), diagnostics: [], mathFailures: [] });
    await s.build();
    expect((await s.build()).previewUrl).toBe("marktwain-preview://pdf/2.pdf");
    expect([...(s.latestPdf() ?? [])]).toEqual([1, 2]);
  });

  it("returns diagnostics for a failed build without a preview", async () => {
    const outcome = await service({
      ok: false,
      diagnostics: [{ severity: "error", message: "boom", file: "contents/chapter01.typ", line: 3, column: 1, source: { documentId: "id-2", block: 0 } }],
      mathFailures: [],
    }).build();
    expect(outcome.ok).toBe(false);
    expect(outcome.previewUrl).toBeNull();
    expect(outcome.diagnostics[0]).toMatchObject({ message: "boom", code: null, source: { documentId: "id-2", block: 0 } });
  });

  it("rejects a second build while one is running", async () => {
    let release!: (r: BuildResult) => void;
    const done: BuildResult = { ok: true, pdf: new Uint8Array(), diagnostics: [], mathFailures: [] };
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
});

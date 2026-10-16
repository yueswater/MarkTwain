import { buildTypst } from "@marktwain/build";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runMergeScenario } from "./merge-scenario.js";
import { SnapshotBench } from "./snapshot-scenario.js";
import { SHAPES, makeThesis, type ShapeName } from "./thesis.js";

const PORT = Number(process.env.PORT ?? 8787);
const TEMPLATE_DIR = process.env.MARKTWAIN_TEMPLATE_DIR ?? resolve(process.cwd(), "../../resources/templates/typ");
const TYPST = process.env.MARKTWAIN_TYPST ?? "typst";
const PACKAGES = process.env.MARKTWAIN_TYPST_PACKAGES;
/** Maximum builds running at once, the rest wait, 0 means no limit. */
const MAX_CONCURRENCY = Number(process.env.MAX_CONCURRENCY ?? 0);

const CONFIG = [
  'title: "壓力測試論文"', 'title-en: "Load Test"', 'author: "測試"', 'author-en: "Test"', 'id: "000"',
  'advisor: "教授"', 'advisor-en: "Prof"', 'college: "學院"', 'college-en: "College"',
  'institute: "系所"', 'institute-en: "Dept"', "date: 2026-06-30", "oral-date: 2026-06-15",
  'keywords: ["甲"]', 'keywords-en: ["a"]',
].join("\n");

// 1x1 PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** Counts page objects in the PDF, good enough for a size check. */
function countPages(pdf: Uint8Array): number {
  return (Buffer.from(pdf).toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

/** The project that the snapshot scenario saves again and again, made at the first save so that the history grows across requests. */
let snapshots: SnapshotBench | null = null;

let running = 0;
const waiting: (() => void)[] = [];

async function acquire(): Promise<void> {
  if (MAX_CONCURRENCY > 0 && running >= MAX_CONCURRENCY) await new Promise<void>((resolve) => waiting.push(resolve));
  running += 1;
}

function release(): void {
  running -= 1;
  waiting.shift()?.();
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const json = (status: number, body: unknown) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };

  if (url.pathname === "/health") return json(200, { ok: true, running });

  // Scenario 3: two branches that each change a share of the blocks of a document, merged, and checked as the unit tests check it
  if (url.pathname === "/merge" && req.method === "POST") {
    const blocks = Number(url.searchParams.get("blocks") ?? 1000);
    const percent = Number(url.searchParams.get("percent") ?? 10);
    if (!(blocks >= 1 && blocks <= 200_000) || !(percent >= 1 && percent <= 50)) return json(400, { error: "blocks is 1 to 200000 and percent is 1 to 50" });
    const run = runMergeScenario(blocks, percent, url.searchParams.get("conflicting") === "1");
    return json(run.ok ? 200 : 500, run);
  }

  // Scenario 4: one save of a version in a project whose history keeps growing, and the summary of how the saves slow down
  if (url.pathname === "/snapshot" && req.method === "POST") {
    snapshots ??= new SnapshotBench(Number(url.searchParams.get("blocks") ?? 1000));
    return json(200, snapshots.step());
  }
  if (url.pathname === "/snapshot/summary") return json(snapshots ? 200 : 404, snapshots?.summary() ?? { error: "no saves yet" });
  if (url.pathname === "/snapshot/reset" && req.method === "POST") {
    snapshots?.close();
    snapshots = null;
    return json(200, { ok: true });
  }
  if (url.pathname !== "/build" || req.method !== "POST") return json(404, { error: "not found" });

  const shape = (url.searchParams.get("shape") ?? "small") as ShapeName;
  if (!(shape in SHAPES)) return json(400, { error: `unknown shape ${shape}` });

  void (async () => {
    const work = mkdtempSync(join(tmpdir(), "mt-bench-"));
    const started = performance.now();
    await acquire();
    const queued = performance.now() - started;
    try {
      const result = await buildTypst({
        templateDir: TEMPLATE_DIR,
        workDir: work,
        typst: TYPST,
        packageCachePath: PACKAGES,
        config: CONFIG,
        documents: makeThesis(SHAPES[shape]),
        files: [{ path: "images/a.png", data: PNG }],
        bibliography: [],
      });
      json(result.ok ? 200 : 500, {
        ok: result.ok,
        shape,
        queuedMs: Math.round(queued),
        totalMs: Math.round(performance.now() - started),
        pdfBytes: result.ok ? result.pdf.length : 0,
        pages: result.ok ? countPages(result.pdf) : 0,
        errors: result.diagnostics.filter((d) => d.severity === "error").map((d) => d.message),
      });
    } catch (error) {
      json(500, { ok: false, errors: [String(error)] });
    } finally {
      release();
      rmSync(work, { recursive: true, force: true });
    }
  })();
});

server.listen(PORT, () => console.log(`bench server on :${PORT}, template ${TEMPLATE_DIR}`));

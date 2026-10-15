import { buildTypst, exportTypstProject, type BuildInput, type BuildResult } from "@marktwain/build";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ErrorCode } from "../../../shared/enums/error-code.enum";
import type { BuildOutcome } from "../../../shared/ipc";
import type { DatabaseSession } from "../../core/database-session";
import { AppError } from "../../core/errors";
import { AssetRepository } from "../asset/asset.repository";
import type { BibliographyService } from "../bibliography/bibliography.service";
import type { FontService } from "../font/font.service";
import type { WatermarkService } from "../watermark/watermark.service";
import type { ConfigService } from "../config/config.service";
import type { BuildPaths } from "../toolchain/build-paths";
import type { DocumentService } from "../document/document.service";

/** The number of pages from the page tree of a PDF, the root has the largest count. */
export function pageCountOf(pdf: Uint8Array): number {
  const text = Buffer.from(pdf).toString("latin1");
  let count = 0;
  for (const match of text.matchAll(/\/Count (\d+)/g)) count = Math.max(count, Number(match[1]));
  return count;
}


type Runner = typeof buildTypst;
type Exporter = typeof exportTypstProject;

/** Builds the thesis PDF and keeps the latest one for the preview. */
export class BuildService {
  private running = false;
  private revision = 0;
  /** Whether the builds of the preview draw the watermark */
  private previewWatermark = false;
  private pdf: Uint8Array | null = null;

  constructor(
    private readonly session: DatabaseSession,
    private readonly documents: DocumentService,
    private readonly config: ConfigService,
    private readonly paths: () => BuildPaths,
    private readonly run: Runner = buildTypst,
    private readonly workDir: string = tmpdir(),
    private readonly exporter: Exporter = exportTypstProject,
    private readonly bibliography?: Pick<BibliographyService, "buildFiles">,
    private readonly watermarks?: Pick<WatermarkService, "files">,
    private readonly fonts?: Pick<FontService, "files">,
  ) {}

  /** The PDF of the latest successful build, for the preview protocol. */
  latestPdf(): Uint8Array | null {
    return this.pdf;
  }

  /** Everything the builder needs, read from the open project. */
  private input(): BuildInput {
    const { typst, templateDir, packageCachePath } = this.paths();
    if (!existsSync(templateDir)) throw new AppError(ErrorCode.BuildTemplateMissing);
    const documents = this.documents.list().map((summary) => {
      const doc = this.documents.get(summary.id);
      return { id: doc.id, kind: doc.kind, text: doc.text };
    });
    return {
      templateDir,
      workDir: this.workDir,
      typst,
      packageCachePath,
      config: this.config.text(),
      documents,
      files: new AssetRepository(this.session.db).list(),
      bibliography: this.bibliography?.buildFiles() ?? [],
      watermarkFiles: this.watermarks?.files() ?? [],
      projectFonts: this.fonts?.files() ?? [],
    };
  }

  setWatermark(on: boolean): void {
    this.previewWatermark = on;
  }

  /** Name for suggested file names, the project title or a fallback. */
  suggestedName(): string {
    return this.config.get().fields.title.trim() || "thesis";
  }

  /** Builds the PDF now, so exporting never depends on an earlier preview, and saves it. */
  async savePdf(path: string, final = false): Promise<void> {
    const result = await this.run({ ...this.input(), format: "pdf", watermark: final });
    if (!result.ok) {
      const first = result.diagnostics.find((d) => d.severity === "error");
      throw new AppError(ErrorCode.ExportFailed, { reason: first?.message ?? "build failed" });
    }
    writeFileSync(path, result.pdf);
  }

  /** Writes the standalone Typst project into a new folder inside parent and returns its path. */
  exportProject(parent: string): string {
    const destination = join(parent, `${this.suggestedName()}-typst`);
    try {
      this.exporter(this.input(), destination);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCode.ExportFailed, { reason: error instanceof Error ? error.message : String(error) });
    }
    return destination;
  }

  async build(): Promise<BuildOutcome> {
    if (this.running) throw new AppError(ErrorCode.BuildBusy);
    const input = this.input();

    this.running = true;
    try {
      const result: BuildResult = await this.run({ ...input, format: "pdf", watermark: this.previewWatermark, anchors: true });

      if (!result.ok && result.diagnostics.some((d) => /ENOENT/.test(d.message))) {
        throw new AppError(ErrorCode.BuildTypstMissing);
      }
      if (result.ok) {
        this.pdf = result.pdf;
        this.revision += 1;
      }
      return {
        ok: result.ok,
        diagnostics: result.diagnostics.map((d) => ({
          severity: d.severity,
          code: d.code ?? null,
          message: d.message,
          file: d.file,
          line: d.line,
          source: d.source,
        })),
        mathFailures: result.mathFailures,
        pageCount: result.ok ? pageCountOf(result.pdf) : 0,
        anchors: result.ok ? result.anchors : [],
        revision: this.revision,
      };
    } finally {
      this.running = false;
    }
  }
}

import { buildTypst, exportTypstProject, type BuildInput, type BuildResult } from "@marktwain/build";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ErrorCode } from "../../../shared/enums/error-code.enum";
import type { BuildOutcome } from "../../../shared/ipc";
import type { DatabaseSession } from "../../core/database-session";
import { AppError } from "../../core/errors";
import { AssetRepository } from "../asset/asset.repository";
import type { ConfigService } from "../config/config.service";
import type { DocumentService } from "../document/document.service";

export type BuildPaths = { typst: string; templateDir: string };

type Runner = typeof buildTypst;
type Exporter = typeof exportTypstProject;

/** Builds the thesis PDF and keeps the latest one for the preview. */
export class BuildService {
  private running = false;
  private revision = 0;
  private latest: Uint8Array | null = null;

  constructor(
    private readonly session: DatabaseSession,
    private readonly documents: DocumentService,
    private readonly config: ConfigService,
    private readonly paths: () => BuildPaths,
    private readonly run: Runner = buildTypst,
    private readonly workDir: string = tmpdir(),
    private readonly exporter: Exporter = exportTypstProject,
  ) {}

  /** PDF bytes of the latest successful build, for the preview protocol. */
  latestPdf(): Uint8Array | null {
    return this.latest;
  }

  /** Everything the builder needs, read from the open project. */
  private input(): BuildInput {
    const { typst, templateDir } = this.paths();
    if (!existsSync(templateDir)) throw new AppError(ErrorCode.BuildTemplateMissing);
    const documents = this.documents.list().map((summary) => {
      const doc = this.documents.get(summary.id);
      return { id: doc.id, kind: doc.kind, text: doc.text };
    });
    return {
      templateDir,
      workDir: this.workDir,
      typst,
      config: this.config.text(),
      documents,
      files: new AssetRepository(this.session.db).list(),
      bibliography: [],
    };
  }

  /** Name for suggested file names, the project title or a fallback. */
  suggestedName(): string {
    return this.config.get().fields.title.trim() || "thesis";
  }

  savePdf(path: string): void {
    if (!this.latest) throw new AppError(ErrorCode.ExportNoPdf);
    writeFileSync(path, this.latest);
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
      const result: BuildResult = await this.run(input);

      if (!result.ok && result.diagnostics.some((d) => /ENOENT/.test(d.message))) {
        throw new AppError(ErrorCode.BuildTypstMissing);
      }
      if (result.ok) {
        this.latest = result.pdf;
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
        previewUrl: result.ok ? `marktwain-preview://pdf/${this.revision}.pdf` : null,
      };
    } finally {
      this.running = false;
    }
  }
}

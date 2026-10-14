import { buildTypst, type BuildResult } from "@marktwain/build";
import { existsSync } from "node:fs";
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
  ) {}

  /** PDF bytes of the latest successful build, for the preview protocol. */
  latestPdf(): Uint8Array | null {
    return this.latest;
  }

  async build(): Promise<BuildOutcome> {
    if (this.running) throw new AppError(ErrorCode.BuildBusy);
    const { typst, templateDir } = this.paths();
    if (!existsSync(templateDir)) throw new AppError(ErrorCode.BuildTemplateMissing);

    this.running = true;
    try {
      const documents = this.documents.list().map((summary) => {
        const doc = this.documents.get(summary.id);
        return { id: doc.id, kind: doc.kind, text: doc.text };
      });
      const files = new AssetRepository(this.session.db).list();
      const result: BuildResult = await this.run({
        templateDir,
        workDir: this.workDir,
        typst,
        config: this.config.text(),
        documents,
        files,
        bibliography: [],
      });

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

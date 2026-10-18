import { isDefaultText } from "../../../shared/default-headings";
import { buildLatex, buildTypst, exportTypstProject, type BuildInput, type BuildResult, type LatexBuildInput } from "@marktwain/build";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ErrorCode } from "../../../shared/enums/error-code.enum";
import type { BuildOutcome, OutputEngine } from "../../../shared/ipc";
import type { DatabaseSession } from "../../core/database-session";
import { AppError } from "../../core/errors";
import { AssetRepository } from "../asset/asset.repository";
import type { BibliographyService } from "../bibliography/bibliography.service";
import type { FontService } from "../font/font.service";
import type { WatermarkService } from "../watermark/watermark.service";
import type { ConfigService } from "../config/config.service";
import type { BuildPaths } from "../toolchain/build-paths";
import type { DocumentService } from "../document/document.service";
import { ProjectRepository } from "../project/project.repository";
import { pageCountOf } from "./pdf-pages";

type Runner = typeof buildTypst;
type LatexRunner = typeof buildLatex;
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
    private readonly runLatex: LatexRunner = buildLatex,
  ) {}

  /** The PDF of the latest successful build, for the preview protocol. */
  latestPdf(): Uint8Array | null {
    return this.pdf;
  }

  /** The engine that the open project was made for. */
  private engine(): OutputEngine {
    return new ProjectRepository(this.session.db).get()?.engine ?? "typst";
  }

  /** What every engine needs, read from the open project. */
  private common() {
    const documents = this.documents.list().map((summary) => {
      const doc = this.documents.get(summary.id);
      return { id: doc.id, kind: doc.kind, text: doc.text };
    });
    return {
      workDir: this.workDir,
      config: this.config.text(),
      documents,
      files: new AssetRepository(this.session.db).list(),
      bibliography: this.bibliography?.buildFiles() ?? [],
      watermarkFiles: this.watermarks?.files() ?? [],
      projectFonts: this.fonts?.files() ?? [],
    };
  }

  /** The Typst template, told as missing before anything is read. */
  private typstPaths(): { typst: string; templateDir: string; packageCachePath: string | undefined } {
    const { typst, templateDir, packageCachePath } = this.paths();
    if (!existsSync(templateDir)) throw new AppError(ErrorCode.BuildTemplateMissing);
    return { typst, templateDir, packageCachePath };
  }

  /** The TeX Live and the LaTeX template, a missing one is told before anything is read. */
  private texPaths(): { bin: string; templateDir: string } {
    const tex = this.paths().tex;
    if (!tex?.bin) throw new AppError(ErrorCode.BuildTexMissing);
    if (!existsSync(tex.templateDir)) throw new AppError(ErrorCode.BuildTemplateMissing);
    return { bin: tex.bin, templateDir: tex.templateDir };
  }

  /** Everything the Typst builder needs. */
  private input(): BuildInput {
    return { ...this.common(), ...this.typstPaths() };
  }

  /** Everything the LaTeX builder needs. */
  private latexInput(): LatexBuildInput {
    const { bin, templateDir } = this.texPaths();
    return { ...this.common(), templateDir, texBin: bin };
  }

  /** Builds with the engine of the project, only Typst reads where the blocks landed on the pages. */
  private compile(format: "pdf", watermark: boolean, anchors: boolean): Promise<BuildResult> {
    if (this.engine() === "latex") return this.runLatex({ ...this.latexInput(), watermark });
    return this.run({ ...this.input(), format, watermark, anchors });
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
    const result = await this.compile("pdf", final, false);
    if (!result.ok) {
      const first = result.diagnostics.find((d) => d.severity === "error");
      throw new AppError(ErrorCode.ExportFailed, { reason: first?.message ?? "build failed" });
    }
    writeFileSync(path, result.pdf);
  }

  /** Writes the standalone Typst project into a new folder inside parent and returns its path. */
  exportProject(parent: string): string {
    // The folder of a LaTeX project comes with the export of the whole project as a zip
    if (this.engine() !== "typst") throw new AppError(ErrorCode.ExportFailed, { reason: "the project is not written for Typst" });
    const destination = join(parent, `${this.suggestedName()}-typst`);
    try {
      this.exporter(this.input(), destination);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCode.ExportFailed, { reason: error instanceof Error ? error.message : String(error) });
    }
    return destination;
  }

  /** A chapter or an appendix that nobody has written in still has the heading it was made with, and prints as an empty chapter with that title. */
  private untouchedChapters(): BuildOutcome["diagnostics"] {
    return this.documents
      .list()
      .flatMap((summary) => {
        const doc = this.documents.get(summary.id);
        if (!isDefaultText(doc.kind, doc.text)) return [];
        const title = doc.text.replace(/^#\s+/, "").trim();
        return [{ severity: "warning" as const, code: "default-chapter" as const, message: title, file: null, line: null, source: { documentId: doc.id, block: 0 } }];
      });
  }

  async build(): Promise<BuildOutcome> {
    if (this.running) throw new AppError(ErrorCode.BuildBusy);
    const latex = this.engine() === "latex";
    // A missing tool or template is told at once, before the project is read
    if (latex) this.texPaths();
    else this.typstPaths();

    this.running = true;
    try {
      const result: BuildResult = await this.compile("pdf", this.previewWatermark, true);

      if (!result.ok && result.diagnostics.some((d) => /ENOENT/.test(d.message))) {
        throw new AppError(latex ? ErrorCode.BuildTexMissing : ErrorCode.BuildTypstMissing);
      }
      if (result.ok) {
        this.pdf = result.pdf;
        this.revision += 1;
      }
      return {
        ok: result.ok,
        diagnostics: [
          ...result.diagnostics.map((d) => ({
            severity: d.severity,
            code: d.code ?? null,
            message: d.message,
            file: d.file,
            line: d.line,
            source: d.source,
          })),
          ...this.untouchedChapters(),
        ],
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

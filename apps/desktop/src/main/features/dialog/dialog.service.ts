import type { TFunction } from "i18next";
import { IMAGE_EXTENSIONS, WATERMARK_EXTENSIONS } from "../../config/app.config";

/** Smallest abstraction over the Electron dialog, for testing. */
export type DialogPort = {
  showSave(options: {
    title: string;
    buttonLabel: string;
    defaultPath: string;
    filters: { name: string; extensions: string[] }[];
  }): Promise<string | null>;
  showOpen(options: {
    title: string;
    buttonLabel: string;
    filters: { name: string; extensions: string[] }[];
  }): Promise<string | null>;
};

export class DialogService {
  constructor(
    private readonly port: DialogPort,
    private readonly translator: () => TFunction,
    /** Path from the test hook, no dialog is shown when set */
    private readonly forcedPath: () => string | undefined = () => undefined,
    private readonly forcedImagePath: () => string | undefined = () => undefined,
    private readonly forcedExportPath: () => string | undefined = () => undefined,
  ) {}

  /** The path of the test hook, null in real use, where the person chooses it in the picker of the app. */
  forcedProjectPath(): string | null {
    return this.forcedPath() ?? null;
  }

  async chooseImage(): Promise<string | null> {
    const forced = this.forcedImagePath();
    if (forced) return forced;
    const t = this.translator();
    return this.port.showOpen({
      title: t("openImage.title"),
      buttonLabel: t("openImage.button"),
      filters: [{ name: t("filter.image"), extensions: [...IMAGE_EXTENSIONS] }],
    });
  }

  async chooseWatermark(): Promise<string | null> {
    const forced = this.forcedImagePath();
    if (forced) return forced;
    const t = this.translator();
    return this.port.showOpen({
      title: t("openWatermark.title"),
      buttonLabel: t("openWatermark.button"),
      filters: [{ name: t("filter.watermark"), extensions: [...WATERMARK_EXTENSIONS] }],
    });
  }

  /** The file of a color theme, the hook of the images also stands in for it, as for every other file that is opened. */
  async chooseColorTheme(): Promise<string | null> {
    const forced = this.forcedImagePath();
    if (forced) return forced;
    const t = this.translator();
    return this.port.showOpen({
      title: t("openTheme.title"),
      buttonLabel: t("openTheme.button"),
      filters: [{ name: t("filter.theme"), extensions: ["colortheme"] }],
    });
  }

  async choosePdfPath(suggestedName: string): Promise<string | null> {
    const forced = this.forcedExportPath();
    if (forced) return forced;
    const t = this.translator();
    return this.port.showSave({
      title: t("savePdf.title"),
      buttonLabel: t("savePdf.button"),
      defaultPath: `${suggestedName}.pdf`,
      filters: [{ name: t("filter.pdf"), extensions: ["pdf"] }],
    });
  }

  async chooseZipPath(suggestedName: string): Promise<string | null> {
    const forced = this.forcedExportPath();
    if (forced) return forced;
    const t = this.translator();
    return this.port.showSave({
      title: t("saveZip.title"),
      buttonLabel: t("saveZip.button"),
      defaultPath: `${suggestedName}.zip`,
      filters: [{ name: t("filter.zip"), extensions: ["zip"] }],
    });
  }
}

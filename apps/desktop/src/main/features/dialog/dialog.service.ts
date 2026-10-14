import { basename, extname } from "node:path";
import type { TFunction } from "i18next";
import { IMAGE_EXTENSIONS, PROJECT_EXTENSION } from "../../config/app.config";

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
  showFolder(options: { title: string; buttonLabel: string }): Promise<string | null>;
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

  private filters(t: TFunction) {
    return [{ name: t("filter.project"), extensions: [PROJECT_EXTENSION] }];
  }

  async chooseNewProject(suggestedName: string): Promise<string | null> {
    const forced = this.forcedPath();
    if (forced) return forced;
    const t = this.translator();
    const chosen = await this.port.showSave({
      title: t("newProject.title"),
      buttonLabel: t("newProject.button"),
      defaultPath: `${suggestedName}.${PROJECT_EXTENSION}`,
      filters: this.filters(t),
    });
    return chosen === null ? null : withExtension(chosen);
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

  async chooseExportFolder(): Promise<string | null> {
    const forced = this.forcedExportPath();
    if (forced) return forced;
    const t = this.translator();
    return this.port.showFolder({ title: t("exportFolder.title"), buttonLabel: t("exportFolder.button") });
  }

  async chooseOpenProject(): Promise<string | null> {
    const forced = this.forcedPath();
    if (forced) return forced;
    const t = this.translator();
    return this.port.showOpen({
      title: t("openProject.title"),
      buttonLabel: t("openProject.button"),
      filters: this.filters(t),
    });
  }
}

/** Adds the extension when the user left it out, some platforms do not add it in the save dialog. */
export function withExtension(path: string): string {
  return extname(basename(path)) === "" ? `${path}.${PROJECT_EXTENSION}` : path;
}

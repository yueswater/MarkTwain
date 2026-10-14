import { basename, extname } from "node:path";
import type { TFunction } from "i18next";
import { PROJECT_EXTENSION } from "../../config/app.config";

/** 對 Electron `dialog` 的最小抽象，方便測試。 */
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
    /** 測試鉤子的路徑；有值就不顯示對話框 */
    private readonly forcedPath: () => string | undefined = () => undefined,
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

/** 使用者沒輸入副檔名時補上（某些平台的儲存對話框不會自動補）。 */
export function withExtension(path: string): string {
  return extname(basename(path)) === "" ? `${path}.${PROJECT_EXTENSION}` : path;
}

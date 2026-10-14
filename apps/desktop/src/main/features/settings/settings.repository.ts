import { isLocale } from "../../../shared/i18n/locale";
import { readJsonSafe, writeJson } from "../../utils/fs.util";
import { DEFAULT_SETTINGS, type AppSettings } from "./settings.types";

/** 設定檔的讀寫；整個功能裡唯一碰檔案的地方。 */
export class SettingsRepository {
  constructor(private readonly file: string) {}

  read(): AppSettings {
    const data = readJsonSafe(this.file) as { locale?: unknown } | null;
    if (!data || typeof data !== "object") return { ...DEFAULT_SETTINGS };
    return { locale: isLocale(data.locale) ? data.locale : null };
  }

  write(settings: AppSettings): void {
    writeJson(this.file, settings);
  }
}

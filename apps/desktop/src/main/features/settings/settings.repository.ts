import { isLocale } from "../../../shared/i18n/locale";
import { readJsonSafe, writeJson } from "../../utils/fs.util";
import { DEFAULT_SETTINGS, type AppSettings } from "./settings.types";

/** Read and write of the settings file, the only place in this feature that touches files. */
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

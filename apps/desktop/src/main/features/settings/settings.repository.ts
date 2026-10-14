import { isLocale } from "../../../shared/i18n/locale";
import { readJsonSafe, writeJson } from "../../utils/fs.util";
import { DEFAULT_SETTINGS, type AppSettings, type RecentEntry } from "./settings.types";

/** Read and write of the settings file, the only place in this feature that touches files. */
export class SettingsRepository {
  constructor(private readonly file: string) {}

  read(): AppSettings {
    const data = readJsonSafe(this.file) as { locale?: unknown; recentProjects?: unknown; lastProject?: unknown } | null;
    if (!data || typeof data !== "object") return { ...DEFAULT_SETTINGS };
    const recent = Array.isArray(data.recentProjects) ? data.recentProjects : [];
    return {
      locale: isLocale(data.locale) ? data.locale : null,
      recentProjects: recent.filter(
        (e): e is RecentEntry =>
          typeof e === "object" &&
          e !== null &&
          typeof (e as RecentEntry).path === "string" &&
          typeof (e as RecentEntry).name === "string" &&
          typeof (e as RecentEntry).openedAt === "number",
      ),
      lastProject: typeof data.lastProject === "string" ? data.lastProject : null,
    };
  }

  write(settings: AppSettings): void {
    writeJson(this.file, settings);
  }
}

import { sanitizePrefs } from "../../../shared/prefs";
import { sanitizeProfile } from "../../../shared/profile";
import { isLocale } from "../../../shared/i18n/locale";
import { readJsonSafe, writeJson } from "../../utils/fs.util";
import { DEFAULT_SETTINGS, SETTINGS_VERSION, type AppSettings, type RecentEntry } from "./settings.types";

/** Read and write of the settings file, the only place in this feature that touches files. */
export class SettingsRepository {
  constructor(private readonly file: string) {}

  read(): AppSettings {
    const data = readJsonSafe(this.file) as { version?: unknown; locale?: unknown; recentProjects?: unknown; lastProject?: unknown; editor?: unknown; profile?: unknown } | null;
    if (!data || typeof data !== "object") return { ...DEFAULT_SETTINGS };
    const recent = Array.isArray(data.recentProjects) ? data.recentProjects : [];
    const editor = sanitizePrefs(data.editor);
    // The first versions had the marks of the changes on, a file from then has that saved as if it was a choice
    if (typeof data.version !== "number" || data.version < 2) editor.showChanges = false;
    return {
      version: SETTINGS_VERSION,
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
      editor,
      profile: sanitizeProfile(data.profile),
    };
  }

  write(settings: AppSettings): void {
    writeJson(this.file, settings);
  }
}

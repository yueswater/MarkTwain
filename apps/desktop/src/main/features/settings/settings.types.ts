import { DEFAULT_PREFS, type EditorPrefs } from "../../../shared/prefs";
import type { Locale } from "../../../shared/enums/locale.enum";

/** App level settings, not part of any project. A null locale follows the OS. */
export type RecentEntry = { path: string; name: string; openedAt: number };

export type AppSettings = {
  locale: Locale | null;
  /** Projects opened before, newest first */
  recentProjects: RecentEntry[];
  /** The project to reopen at startup, null after the user closed it */
  lastProject: string | null;
  editor: EditorPrefs;
};

export const DEFAULT_SETTINGS: AppSettings = { locale: null, recentProjects: [], lastProject: null, editor: DEFAULT_PREFS };

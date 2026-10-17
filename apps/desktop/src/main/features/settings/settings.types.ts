import { DEFAULT_PREFS, type EditorPrefs } from "../../../shared/prefs";
import { DEFAULT_PROFILE, type AuthorProfile } from "../../../shared/profile";
import type { Locale } from "../../../shared/enums/locale.enum";

/** App level settings, not part of any project. A null locale follows the OS. */
export type RecentEntry = { path: string; name: string; openedAt: number };

/** Version of the settings file, 2 turned the marks of the changes off, they had been on from the start */
export const SETTINGS_VERSION = 2;

export type AppSettings = {
  version: number;
  locale: Locale | null;
  /** Projects opened before, newest first */
  recentProjects: RecentEntry[];
  /** The project to reopen at startup, null after the user closed it */
  lastProject: string | null;
  editor: EditorPrefs;
  /** Facts of the author that new projects start with */
  profile: AuthorProfile;
};

export const DEFAULT_SETTINGS: AppSettings = { version: SETTINGS_VERSION, locale: null, recentProjects: [], lastProject: null, editor: DEFAULT_PREFS, profile: DEFAULT_PROFILE };

import type { Locale } from "../../../shared/enums/locale.enum";

/** App level settings, not part of any project. A null locale follows the OS. */
export type AppSettings = { locale: Locale | null };

export const DEFAULT_SETTINGS: AppSettings = { locale: null };

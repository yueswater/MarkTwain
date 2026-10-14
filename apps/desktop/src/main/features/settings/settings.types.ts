import type { Locale } from "../../../shared/enums/locale.enum";

/** 應用程式層級的設定（不屬於任何專案）。locale 為 null 表示跟隨作業系統。 */
export type AppSettings = { locale: Locale | null };

export const DEFAULT_SETTINGS: AppSettings = { locale: null };

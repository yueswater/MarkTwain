import { Locale, SUPPORTED_LOCALES } from "../enums/locale.enum";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * 決定介面語言：使用者的設定優先；沒有設定時依作業系統語系，
 * zh 開頭用繁體中文，其餘一律用英文。
 */
export function resolveLocale(osLocale: string, setting: Locale | null): Locale {
  if (setting) return setting;
  return osLocale.toLowerCase().startsWith("zh") ? Locale.ZhHant : Locale.En;
}

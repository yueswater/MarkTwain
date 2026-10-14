import { Locale, SUPPORTED_LOCALES } from "../enums/locale.enum";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Decides the interface language, the user setting wins, otherwise the OS locale,
 * zh prefixes use Traditional Chinese and everything else uses English.
 */
export function resolveLocale(osLocale: string, setting: Locale | null): Locale {
  if (setting) return setting;
  return osLocale.toLowerCase().startsWith("zh") ? Locale.ZhHant : Locale.En;
}

import type { Locale } from "../../shared/enums/locale.enum";
import { resolveLocale } from "../../shared/i18n/locale";
import type { LocaleView } from "../../shared/ipc";

/** Turns the user setting and the OS locale into what the renderer needs. */
export function describeLocale(osLocale: string, setting: Locale | null): LocaleView {
  return { setting, effective: resolveLocale(osLocale, setting) };
}

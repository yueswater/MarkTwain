import type { Locale } from "../../shared/enums/locale.enum";
import { resolveLocale } from "../../shared/i18n/locale";
import type { LocaleView } from "../../shared/ipc";

/** 把使用者的設定與作業系統語系整理成前端要的形式。 */
export function describeLocale(osLocale: string, setting: Locale | null): LocaleView {
  return { setting, effective: resolveLocale(osLocale, setting) };
}

import i18n, { type TFunction } from "i18next";
import { DEFAULT_LOCALE } from "../../shared/config/i18n.config";
import type { Locale } from "../../shared/enums/locale.enum";
import { resources } from "../../shared/i18n/resources";

const instance = i18n.createInstance();
const ready = instance.init({
  resources,
  fallbackLng: DEFAULT_LOCALE,
  initAsync: false,
  interpolation: { escapeValue: false },
});

/** Translation function of the main process for native dialogs and menus, sharing the message catalog with the renderer. */
export function translatorFor(locale: Locale, ns: string): TFunction {
  void ready;
  return instance.getFixedT(locale, ns);
}

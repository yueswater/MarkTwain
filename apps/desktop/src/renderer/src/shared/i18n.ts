import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LOCALE, DEFAULT_NAMESPACE } from "../../../shared/config/i18n.config";
import type { Locale } from "../../../shared/enums/locale.enum";
import { resources } from "../../../shared/i18n/resources";

/** The language of the page for a locale, screen readers pick the voice from it. */
export function pageLanguage(locale: string): string {
  return locale.startsWith("zh") ? "zh-Hant" : "en";
}

export async function initI18n(locale: Locale): Promise<void> {
  await i18n.use(initReactI18next).init({
    resources,
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    defaultNS: DEFAULT_NAMESPACE,
    interpolation: { escapeValue: false }, // React already escapes
  });
  // The page said Chinese whatever the interface was
  document.documentElement.lang = pageLanguage(i18n.language);
  i18n.on("languageChanged", (language) => {
    document.documentElement.lang = pageLanguage(language);
  });
}

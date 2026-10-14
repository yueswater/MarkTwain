import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LOCALE, DEFAULT_NAMESPACE } from "../../../shared/config/i18n.config";
import type { Locale } from "../../../shared/enums/locale.enum";
import { resources } from "../../../shared/i18n/resources";

export async function initI18n(locale: Locale): Promise<void> {
  await i18n.use(initReactI18next).init({
    resources,
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    defaultNS: DEFAULT_NAMESPACE,
    interpolation: { escapeValue: false }, // React already escapes
  });
}

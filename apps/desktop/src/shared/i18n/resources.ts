import enCommon from "./locales/en/common.json";
import enDiagnostics from "./locales/en/diagnostics.json";
import zhHantCommon from "./locales/zh-Hant/common.json";
import zhHantDiagnostics from "./locales/zh-Hant/diagnostics.json";

/** 新增命名空間時，在兩個語言各加一行。 */
export const resources = {
  "zh-Hant": { common: zhHantCommon, diagnostics: zhHantDiagnostics },
  en: { common: enCommon, diagnostics: enDiagnostics },
} as const;

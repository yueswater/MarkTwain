import enCommon from "./locales/en/common.json";
import enMenu from "./locales/en/menu.json";
import enConfig from "./locales/en/config.json";
import enEditor from "./locales/en/editor.json";
import enProject from "./locales/en/project.json";
import enDialog from "./locales/en/dialog.json";
import enDiagnostics from "./locales/en/diagnostics.json";
import zhHantCommon from "./locales/zh-Hant/common.json";
import zhHantMenu from "./locales/zh-Hant/menu.json";
import zhHantConfig from "./locales/zh-Hant/config.json";
import zhHantEditor from "./locales/zh-Hant/editor.json";
import zhHantProject from "./locales/zh-Hant/project.json";
import zhHantDialog from "./locales/zh-Hant/dialog.json";
import zhHantDiagnostics from "./locales/zh-Hant/diagnostics.json";

/** 新增命名空間時，在兩個語言各加一行。 */
export const resources = {
  "zh-Hant": { common: zhHantCommon, diagnostics: zhHantDiagnostics, dialog: zhHantDialog, project: zhHantProject, editor: zhHantEditor, config: zhHantConfig, menu: zhHantMenu },
  en: { common: enCommon, diagnostics: enDiagnostics, dialog: enDialog, project: enProject, editor: enEditor, config: enConfig, menu: enMenu },
} as const;

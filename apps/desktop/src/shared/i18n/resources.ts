import enCommon from "./locales/en/common.json";
import enSettings from "./locales/en/settings.json";
import enBuild from "./locales/en/build.json";
import enMenu from "./locales/en/menu.json";
import enConfig from "./locales/en/config.json";
import enEditor from "./locales/en/editor.json";
import enProject from "./locales/en/project.json";
import enDialog from "./locales/en/dialog.json";
import enDiagnostics from "./locales/en/diagnostics.json";
import enBibliography from "./locales/en/bibliography.json";
import enVersions from "./locales/en/versions.json";
import zhHantCommon from "./locales/zh-Hant/common.json";
import zhHantSettings from "./locales/zh-Hant/settings.json";
import zhHantBuild from "./locales/zh-Hant/build.json";
import zhHantMenu from "./locales/zh-Hant/menu.json";
import zhHantConfig from "./locales/zh-Hant/config.json";
import zhHantEditor from "./locales/zh-Hant/editor.json";
import zhHantProject from "./locales/zh-Hant/project.json";
import zhHantDialog from "./locales/zh-Hant/dialog.json";
import zhHantDiagnostics from "./locales/zh-Hant/diagnostics.json";
import zhHantBibliography from "./locales/zh-Hant/bibliography.json";
import zhHantVersions from "./locales/zh-Hant/versions.json";

/** Add one line per language when adding a namespace. */
export const resources = {
  "zh-Hant": { common: zhHantCommon, diagnostics: zhHantDiagnostics, dialog: zhHantDialog, project: zhHantProject, editor: zhHantEditor, config: zhHantConfig, menu: zhHantMenu, build: zhHantBuild, settings: zhHantSettings, bibliography: zhHantBibliography, versions: zhHantVersions },
  en: { common: enCommon, diagnostics: enDiagnostics, dialog: enDialog, project: enProject, editor: enEditor, config: enConfig, menu: enMenu, build: enBuild, settings: enSettings, bibliography: enBibliography, versions: enVersions },
} as const;

import { declareAssetScheme, handleAssetProtocol } from "./core/asset-protocol";
import { settingsFilePath } from "./config/paths.config";
import { readFileSync } from "node:fs";
import { DEFAULT_NUMBERING } from "./config/numbering.config";
import { join } from "node:path";
import { bootstrap } from "./core/bootstrap";
import { DatabaseSession } from "./core/database-session";
import { registerWatermarkController } from "./features/watermark/watermark.controller";
import { WatermarkService } from "./features/watermark/watermark.service";
import { FontService } from "./features/font/font.service";
import { TableTemplateService } from "./features/table-template/table-template.service";
import { registerTableTemplateController, tableTemplatesFolder } from "./features/table-template/table-template.controller";
import { registerFontController } from "./features/font/font.controller";
import { registerBibliographyController } from "./features/bibliography/bibliography.controller";
import { BibliographyService } from "./features/bibliography/bibliography.service";
import { registerAssetController } from "./features/asset/asset.controller";
import { AssetService } from "./features/asset/asset.service";
import { registerAppController } from "./features/app/app.controller";
import type { DialogService } from "./features/dialog/dialog.service";
import { registerExportController } from "./features/build/export.controller";
import { registerBuildController } from "./features/build/build.controller";
import { resolveBuildPaths } from "./features/toolchain/build-paths";
import { registerToolchainController } from "./features/toolchain/toolchain.controller";
import { ToolchainService } from "./features/toolchain/toolchain.service";
import { BuildService } from "./features/build/build.service";
import { registerConfigController } from "./features/config/config.controller";
import { ConfigService } from "./features/config/config.service";
import { registerDialogController } from "./features/dialog/dialog.controller";
import { registerDocumentController } from "./features/document/document.controller";
import { DocumentService } from "./features/document/document.service";
import { registerLabelController } from "./features/label/label.controller";
import { LabelService } from "./features/label/label.service";
import { applyAppMenu } from "./features/menu/menu.controller";
import { registerProjectController } from "./features/project/project.controller";
import { ProjectService } from "./features/project/project.service";
import { PrefsService } from "./features/prefs/prefs.service";
import { registerSearchController } from "./features/search/search.controller";
import { SearchService } from "./features/search/search.service";
import { registerProfileController } from "./features/profile/profile.controller";
import { ProfileService } from "./features/profile/profile.service";
import { registerPrefsController } from "./features/prefs/prefs.controller";
import { RecentService } from "./features/recent/recent.service";
import { SettingsRepository } from "./features/settings/settings.repository";
import { registerSettingsController } from "./features/settings/settings.controller";
import { registerVersionController } from "./features/version/version.controller";
import { VersionService } from "./features/version/version.service";
import { projectWorkingCopy } from "./features/version/working-copy";

// Composition root, creates the shared objects and passes each feature controller to bootstrap.
const session = new DatabaseSession();
const documents = new DocumentService(session);
const projects = new ProjectService(session, documents);
const assets = new AssetService(session);
const search = new SearchService(documents);
const bibliography = new BibliographyService(session, documents);
const config = new ConfigService(session, undefined, (path) => {
  try {
    return readFileSync(join(resolveBuildPaths().templateDir, path), "utf8");
  } catch {
    return null;
  }
});
const labels = new LabelService(documents, () => {
  // The thesis settings decide whether equation numbers restart in each chapter, a closed project uses the defaults
  try {
    const { values, inherited } = config.advanced();
    return { ...DEFAULT_NUMBERING, numberPerChapter: (values["layout.equation-per-chapter"] ?? inherited["layout.equation-per-chapter"]) === true };
  } catch {
    return DEFAULT_NUMBERING;
  }
});
const settingsRepository = new SettingsRepository(settingsFilePath());
const recent = new RecentService(settingsRepository);
const prefs = new PrefsService(settingsRepository);
const profile = new ProfileService(settingsRepository);
const watermarks = new WatermarkService(session, config, resolveBuildPaths);
const tableTemplates = new TableTemplateService(tableTemplatesFolder);
const fonts = new FontService(session, config, resolveBuildPaths);
const build = new BuildService(session, documents, config, resolveBuildPaths, undefined, undefined, undefined, bibliography, watermarks, fonts);
const versions = new VersionService(session, projectWorkingCopy(documents, assets));
let dialogs: DialogService;

// The custom protocol must be declared before app ready
declareAssetScheme();

bootstrap([
  registerAppController,
  () => registerSettingsController(applyAppMenu),
  applyAppMenu,
  () => {
    dialogs = registerDialogController();
  },
  () => registerAssetController(assets, dialogs),
  () => handleAssetProtocol((path) => assets.read(path)),
  () => registerProjectController(projects, recent),
  () => registerDocumentController(documents),
  () => registerLabelController(labels),
  () => registerVersionController(versions),
  () => registerConfigController(config),
  () => registerPrefsController(prefs),
  () => registerProfileController(profile),
  () => registerSearchController(search),
  () => registerBibliographyController(bibliography),
  () => registerWatermarkController(watermarks, dialogs),
  () => registerFontController(fonts),
  () => registerTableTemplateController(tableTemplates),
  () => registerBuildController(build),
  () => registerToolchainController(new ToolchainService(resolveBuildPaths)),
  () => registerExportController(build, dialogs),
]);

import { declareAssetScheme, handleAssetProtocol } from "./core/asset-protocol";
import { bootstrap } from "./core/bootstrap";
import { DatabaseSession } from "./core/database-session";
import { registerAssetController } from "./features/asset/asset.controller";
import { AssetService } from "./features/asset/asset.service";
import { registerAppController } from "./features/app/app.controller";
import type { DialogService } from "./features/dialog/dialog.service";
import { registerBuildController, resolveBuildPaths } from "./features/build/build.controller";
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
import { registerSettingsController } from "./features/settings/settings.controller";

// 組合根：在這裡建立共用的物件，並把各 feature 的 controller 傳給 bootstrap。
const session = new DatabaseSession();
const documents = new DocumentService(session);
const projects = new ProjectService(session, documents);
const labels = new LabelService(documents);
const assets = new AssetService(session);
const config = new ConfigService(session);
const build = new BuildService(session, documents, config, resolveBuildPaths);
let dialogs: DialogService;

// 自訂協定必須在 app ready 之前宣告
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
  () => registerProjectController(projects),
  () => registerDocumentController(documents),
  () => registerLabelController(labels),
  () => registerConfigController(config),
  () => registerBuildController(build),
]);

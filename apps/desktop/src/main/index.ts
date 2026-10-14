import { bootstrap } from "./core/bootstrap";
import { DatabaseSession } from "./core/database-session";
import { registerAppController } from "./features/app/app.controller";
import { registerDialogController } from "./features/dialog/dialog.controller";
import { registerDocumentController } from "./features/document/document.controller";
import { DocumentService } from "./features/document/document.service";
import { registerLabelController } from "./features/label/label.controller";
import { LabelService } from "./features/label/label.service";
import { registerProjectController } from "./features/project/project.controller";
import { ProjectService } from "./features/project/project.service";
import { registerSettingsController } from "./features/settings/settings.controller";

// 組合根：在這裡建立共用的物件，並把各 feature 的 controller 傳給 bootstrap。
const session = new DatabaseSession();
const documents = new DocumentService(session);
const projects = new ProjectService(session, documents);
const labels = new LabelService(documents);

bootstrap([
  registerAppController,
  registerSettingsController,
  registerDialogController,
  () => registerProjectController(projects),
  () => registerDocumentController(documents),
  () => registerLabelController(labels),
]);

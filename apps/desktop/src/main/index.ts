import { bootstrap } from "./core/bootstrap";
import { registerAppController } from "./features/app/app.controller";
import { registerSettingsController } from "./features/settings/settings.controller";

// 組合根：新增 feature 時，在這裡加入它的 controller。
bootstrap([registerAppController, registerSettingsController]);

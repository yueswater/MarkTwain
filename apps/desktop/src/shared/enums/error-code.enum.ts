/**
 * 傳給前端的錯誤代碼。值同時是訊息目錄 `diagnostics` 命名空間裡
 * `error.<代碼>` 的鍵（規格 3.5 節）：新增代碼時，兩個語言都要加訊息。
 */
export const ErrorCode = {
  Unknown: "app.unknown",
  InvalidLocale: "settings.invalid-locale",
  ProjectNotFound: "project.not-found",
  ProjectInvalid: "project.invalid",
  ProjectExists: "project.exists",
  ProjectTooNew: "project.too-new",
  ProjectNoneOpen: "project.none-open",
  DocumentNotFound: "document.not-found",
  DocumentSingleton: "document.singleton",
  BuildBusy: "build.busy",
  BuildTypstMissing: "build.typst-missing",
  BuildTemplateMissing: "build.template-missing",
  ConfigInvalid: "config.invalid",
  AssetUnsupported: "asset.unsupported",
  AssetTooLarge: "asset.too-large",
  AssetUnreadable: "asset.unreadable",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

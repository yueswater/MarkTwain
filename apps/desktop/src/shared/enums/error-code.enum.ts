/**
 * Error codes sent to the renderer. The value is also the key error.<code> in the diagnostics namespace
 * of the message catalog, so add messages in both languages when adding a code.
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
  ExportNoPdf: "export.no-pdf",
  ExportFailed: "export.failed",
  ConfigInvalid: "config.invalid",
  AssetUnsupported: "asset.unsupported",
  AssetTooLarge: "asset.too-large",
  AssetUnreadable: "asset.unreadable",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

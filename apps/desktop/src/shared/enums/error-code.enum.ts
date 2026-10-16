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
  ProjectEngineUnavailable: "project.engine-unavailable",
  DocumentNotFound: "document.not-found",
  DocumentSingleton: "document.singleton",
  BuildBusy: "build.busy",
  BuildTypstMissing: "build.typst-missing",
  BuildTemplateMissing: "build.template-missing",
  BuildTexMissing: "build.tex-missing",
  ExportNoPdf: "export.no-pdf",
  ExportFailed: "export.failed",
  ConfigInvalid: "config.invalid",
  AssetUnsupported: "asset.unsupported",
  AssetTooLarge: "asset.too-large",
  AssetUnreadable: "asset.unreadable",
  BibliographyInvalidKey: "bibliography.invalid-key",
  BibliographyDuplicateKey: "bibliography.duplicate-key",
  BibliographyNotFound: "bibliography.not-found",
  TableTemplateUnknown: "table-template.unknown",
  VersionNameEmpty: "version.name-empty",
  VersionMessageEmpty: "version.message-empty",
  VersionNameTaken: "version.name-taken",
  VersionBranchNotFound: "version.branch-not-found",
  VersionSnapshotNotFound: "version.snapshot-not-found",
  VersionMainProtected: "version.main-protected",
  VersionNothingToSave: "version.nothing-to-save",
  VersionUnsavedChanges: "version.unsaved-changes",
  VersionMainHasDraft: "version.main-has-draft",
  VersionConflicts: "version.conflicts",
  VersionNothingToMerge: "version.nothing-to-merge",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** 所有 IPC channel 的名稱；契約型別以這裡的值當鍵，避免打錯字串。 */
export const IpcChannel = {
  AppInfo: "app:info",
  SettingsGetLocale: "settings:get-locale",
  SettingsSetLocale: "settings:set-locale",
  ProjectCreate: "project:create",
  ProjectOpen: "project:open",
  ProjectCurrent: "project:current",
  ProjectClose: "project:close",
  ConfigGet: "config:get",
  ConfigSet: "config:set",
  AssetImportImage: "asset:import-image",
  LabelResolve: "label:resolve",
  DialogChooseNewProject: "dialog:choose-new-project",
  DialogChooseOpenProject: "dialog:choose-open-project",
  DocumentList: "document:list",
  DocumentGet: "document:get",
  DocumentSave: "document:save",
  DocumentCreate: "document:create",
  DocumentDelete: "document:delete",
  DocumentMove: "document:move",
  DocumentRename: "document:rename",
} as const;

export type IpcChannel = (typeof IpcChannel)[keyof typeof IpcChannel];

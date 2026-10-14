/** 所有 IPC channel 的名稱；契約型別以這裡的值當鍵，避免打錯字串。 */
export const IpcChannel = {
  AppInfo: "app:info",
  SettingsGetLocale: "settings:get-locale",
  SettingsSetLocale: "settings:set-locale",
} as const;

export type IpcChannel = (typeof IpcChannel)[keyof typeof IpcChannel];

export const APP_NAME = "MarkTwain";

export const WINDOW_SIZE = { width: 1280, height: 800 } as const;

/** electron-vite 的開發伺服器網址所在的環境變數。 */
export const RENDERER_URL_ENV = "ELECTRON_RENDERER_URL";

export const SETTINGS_FILE_NAME = "settings.json";

/** 專案檔的副檔名（不含點）。 */
export const PROJECT_EXTENSION = "marktwain";

/** 測試鉤子：設定後，檔案對話框不會顯示，直接回傳這個路徑。 */
export const TEST_DIALOG_PATH_ENV = "MARKTWAIN_TEST_DIALOG_PATH";

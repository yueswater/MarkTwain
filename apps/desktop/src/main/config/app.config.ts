export const APP_NAME = "MarkTwain";

export const WEBSITE_URL = "https://github.com/yueswater/MarkTwain";

export const WINDOW_SIZE = { width: 1280, height: 800 } as const;

/** electron-vite 的開發伺服器網址所在的環境變數。 */
export const RENDERER_URL_ENV = "ELECTRON_RENDERER_URL";

export const SETTINGS_FILE_NAME = "settings.json";

/** 專案檔的副檔名（不含點）。 */
export const PROJECT_EXTENSION = "marktwain";

/** 圖片的限制：副檔名（不含點）與大小上限。 */
export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "svg"] as const;
export const IMAGE_MAX_BYTES = 25 * 1024 * 1024;

/** 專案裡的檔案以這個自訂協定提供給編輯器顯示（見 core/asset-protocol）。 */
export const ASSET_SCHEME = "marktwain-asset";

/** 測試鉤子：設定後，選擇圖片的對話框不會顯示，直接使用這個路徑。 */
export const TEST_IMAGE_PATH_ENV = "MARKTWAIN_TEST_IMAGE_PATH";

/** 測試鉤子：設定後，檔案對話框不會顯示，直接回傳這個路徑。 */
/** Overrides where the typst executable and the Typst template are found. */
export const TYPST_PATH_ENV = "MARKTWAIN_TYPST";
export const TEMPLATE_DIR_ENV = "MARKTWAIN_TEMPLATE_DIR";

/** URL scheme that serves the last built PDF to the preview. */
export const PREVIEW_SCHEME = "marktwain-preview";

export const TEST_DIALOG_PATH_ENV = "MARKTWAIN_TEST_DIALOG_PATH";

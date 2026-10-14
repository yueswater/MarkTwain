export const APP_NAME = "MarkTwain";

export const WEBSITE_URL = "https://github.com/yueswater/MarkTwain";

export const WINDOW_SIZE = { width: 1280, height: 800 } as const;

/** Environment variable holding the electron-vite dev server URL. */
export const RENDERER_URL_ENV = "ELECTRON_RENDERER_URL";

export const SETTINGS_FILE_NAME = "settings.json";

/** File extension of project files, without the dot. */
export const PROJECT_EXTENSION = "marktwain";

/** Image limits, allowed extensions without the dot and the size cap. */
export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "svg"] as const;

/** Files that can be a watermark, a PDF is allowed for the logos that schools give as vector files. */
export const WATERMARK_EXTENSIONS = ["png", "jpg", "jpeg", "svg", "pdf"] as const;
export const WATERMARK_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_MAX_BYTES = 25 * 1024 * 1024;

/** Custom protocol that serves project files to the editor, see core/asset-protocol. */
export const ASSET_SCHEME = "marktwain-asset";

/** Test hook, when set the image dialog is skipped and this path is used. */
export const TEST_IMAGE_PATH_ENV = "MARKTWAIN_TEST_IMAGE_PATH";

/** Test hook, when set the file dialog is skipped and this path is returned. */
/** Overrides where the typst executable and the Typst template are found. */
export const TYPST_PATH_ENV = "MARKTWAIN_TYPST";
export const TEMPLATE_DIR_ENV = "MARKTWAIN_TEMPLATE_DIR";

/** URL scheme that serves the last built PDF to the preview. */
export const PREVIEW_SCHEME = "marktwain-preview";

export const TEST_DIALOG_PATH_ENV = "MARKTWAIN_TEST_DIALOG_PATH";

/** Test hook: when set, export dialogs are skipped and this path is used. */
export const TEST_EXPORT_PATH_ENV = "MARKTWAIN_TEST_EXPORT_PATH";

export const APP_NAME = "MarkTwain";

export const WEBSITE_URL = "https://github.com/yueswater/MarkTwain";

export const WINDOW_SIZE = { width: 1280, height: 800 } as const;
export const MIN_WINDOW_SIZE = { width: 960, height: 600 } as const;

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

/** Test hook, when set to 1 the window is never shown and the app keeps out of the dock, so the end-to-end tests do not take the screen. */
export const HEADLESS_ENV = "MARKTWAIN_HEADLESS";

/** Test hook, when set the image dialog is skipped and this path is used. */
export const TEST_IMAGE_PATH_ENV = "MARKTWAIN_TEST_IMAGE_PATH";

/** Test hook, when set the file dialog is skipped and this path is returned. */
/** Overrides where the typst executable, its packages and the Typst template are found. */
export const TYPST_PATH_ENV = "MARKTWAIN_TYPST";
export const TYPST_PACKAGES_ENV = "MARKTWAIN_TYPST_PACKAGES";
export const TEMPLATE_DIR_ENV = "MARKTWAIN_TEMPLATE_DIR";
/** The folder with xelatex, latexmk and texlua of a TeX Live, found by hand in development until the installer carries one */
export const TEX_BIN_ENV = "MARKTWAIN_TEX_BIN";
export const TEX_TEMPLATE_DIR_ENV = "MARKTWAIN_TEX_TEMPLATE_DIR";

/** URL scheme that serves the last built PDF to the preview. */
export const PREVIEW_SCHEME = "marktwain-preview";

export const TEST_DIALOG_PATH_ENV = "MARKTWAIN_TEST_DIALOG_PATH";
/** Set to 1 and the windows open and close without animation, as the tests need them at their place at once, also when the window is shown */
export const TEST_NO_ANIMATION_ENV = "MARKTWAIN_TEST_NO_ANIMATION";
/** Set to 1 and a new chapter starts empty, so the tests that type into a blank chapter need no change, the tests of the default heading leave it out */
export const TEST_NO_DEFAULT_HEADING_ENV = "MARKTWAIN_TEST_NO_DEFAULT_HEADING";
/** The folder that the picker of the app opens on, for the tests of the picker */
export const TEST_PICKER_START_ENV = "MARKTWAIN_TEST_PICKER_START";

/** Test hook: when set, export dialogs are skipped and this path is used. */
export const TEST_EXPORT_PATH_ENV = "MARKTWAIN_TEST_EXPORT_PATH";

/** Test hook, when set to 1 a new project does not ask for the facts of the thesis. */
export const TEST_NO_PROFILE_DIALOG_ENV = "MARKTWAIN_TEST_NO_PROFILE_DIALOG";

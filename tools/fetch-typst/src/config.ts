import type { PlatformKey } from "./types";

/** The keys match the os and arch macros of electron-builder, so a folder name can be used in extraResources. */
export const PLATFORM_KEYS: readonly PlatformKey[] = ["mac-arm64", "mac-x64", "win-x64", "linux-x64"];

export const SHA256_PATTERN = /^[0-9a-f]{64}$/;
export const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
export const PACKAGE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
export const ASSET_PATTERN = /^[A-Za-z0-9._-]+\.(tar\.xz|zip)$/;

export const LOCK_FILE = "typst.lock.json";
export const TYPST_DIR = ["resources", "typst"] as const;
export const PACKAGES_DIR = ["resources", "typst-packages"] as const;

/** Name of the marker file next to a fetched binary or in the folder of a fetched package. */
export const MARKER_FILE = ".marktwain-typst.json";

export const RELEASE_BASE = "https://github.com/typst/typst/releases/download";
export const PACKAGE_BASE = "https://packages.typst.org/preview";

/** Namespace folder of the packages inside the package cache. */
export const PACKAGE_NAMESPACE = "preview";

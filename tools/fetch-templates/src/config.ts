import type { TemplateName } from "./types";

export const TEMPLATE_NAMES: readonly TemplateName[] = ["typ", "tex"];

export const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
export const SHA_PATTERN = /^[0-9a-f]{40}$/;

/** 抓取結果根目錄裡的標記檔名稱。 */
export const MARKER_FILE = ".marktwain-template.json";

export const LOCK_FILE = "templates.lock.json";
export const OUTPUT_DIR = ["resources", "templates"] as const;

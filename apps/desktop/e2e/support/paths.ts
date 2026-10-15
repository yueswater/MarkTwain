import { join, resolve } from "node:path";

/** The root of the repository. */
export const REPO_ROOT = resolve(__dirname, "../../../..");
/** The unpacked app that electron-builder made. */
export const DIST = join(REPO_ROOT, "apps/desktop/dist");
/** Where the tests that take screenshots put them, CI uploads the folder. */
export const OUT_DIR = join(REPO_ROOT, "apps/desktop/e2e-output");
/** The Typst template that pnpm templates:fetch puts in place. */
export const TEMPLATE_DIR = join(REPO_ROOT, "resources/templates/typ");

import { app } from "electron";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { TEMPLATE_DIR_ENV, TYPST_PACKAGES_ENV, TYPST_PATH_ENV } from "../../config/app.config";
import { resolveTypstPaths } from "./typst-paths";

/** Where the toolchain of a build is: the typst executable, the packages that it needs and the template. */
export type BuildPaths = { typst: string; templateDir: string; packageCachePath?: string };

/** The typst executable, its packages and the template folder, overridable for tests and development. */
export function resolveBuildPaths(): BuildPaths {
  const repoRoot = resolve(app.getAppPath(), "../..");
  const root = app.isPackaged ? process.resourcesPath : repoRoot;
  const { typst, packageCachePath } = resolveTypstPaths({
    envTypst: process.env[TYPST_PATH_ENV],
    envPackages: process.env[TYPST_PACKAGES_ENV],
    packaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    repoRoot,
    platform: process.platform,
    arch: process.arch,
    homeDir: homedir(),
    exists: existsSync,
  });
  return {
    typst,
    packageCachePath,
    templateDir: process.env[TEMPLATE_DIR_ENV] || join(root, "resources", "templates", "typ"),
  };
}

import { app } from "electron";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { TEMPLATE_DIR_ENV, TEX_BIN_ENV, TEX_TEMPLATE_DIR_ENV, TYPST_PACKAGES_ENV, TYPST_PATH_ENV } from "../../config/app.config";
import { resolveTexBin } from "./tex-paths";
import { resolveTypstPaths } from "./typst-paths";

/** Where the toolchain of a build is: the typst executable, the packages that it needs and the template. */
export type BuildPaths = {
  typst: string;
  templateDir: string;
  packageCachePath?: string;
  /** The LaTeX side, bin is the folder of xelatex, latexmk and texlua and null when no TeX Live is found */
  tex?: { bin: string | null; templateDir: string };
};

/** Names in a folder, empty when it cannot be read. */
function listDir(path: string): string[] {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}

/** The typst executable, its packages, the template folders and the TeX Live, overridable for tests and development. */
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
    tex: {
      bin: resolveTexBin({
        envBin: process.env[TEX_BIN_ENV],
        pathEnv: process.env.PATH,
        platform: process.platform,
        homeDir: homedir(),
        appData: process.env.APPDATA,
        exists: existsSync,
        listDir,
      }),
      templateDir: process.env[TEX_TEMPLATE_DIR_ENV] || join(root, "resources", "templates", "tex"),
    },
  };
}

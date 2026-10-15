import { join } from "node:path";

export type TypstPathInput = {
  /** Value of MARKTWAIN_TYPST */
  envTypst: string | undefined;
  /** Value of MARKTWAIN_TYPST_PACKAGES */
  envPackages: string | undefined;
  packaged: boolean;
  /** The resources folder of the installed app */
  resourcesPath: string;
  /** The repository root, where resources/ is fetched into during development */
  repoRoot: string;
  platform: NodeJS.Platform;
  arch: string;
  homeDir: string;
  exists: (path: string) => boolean;
};

export type TypstPaths = { typst: string; packageCachePath: string | undefined };

/** Folder name under resources/typst, it matches the os and arch macros of electron-builder. */
export function bundledKey(platform: NodeJS.Platform, arch: string): string {
  const os = platform === "darwin" ? "mac" : platform === "win32" ? "win" : "linux";
  return `${os}-${arch}`;
}

/** Places where typst is usually installed, a GUI app does not inherit the shell PATH. */
function typstCandidates(platform: NodeJS.Platform, homeDir: string): string[] {
  if (platform === "darwin") return ["/opt/homebrew/bin/typst", "/usr/local/bin/typst", join(homeDir, ".cargo/bin/typst")];
  if (platform === "linux") return ["/usr/bin/typst", "/usr/local/bin/typst", join(homeDir, ".cargo/bin/typst")];
  return [];
}

/**
 * The typst executable and the package folder.
 * The order is the environment, the bundled files, and only outside the installed app the usual places and PATH.
 */
export function resolveTypstPaths(input: TypstPathInput): TypstPaths {
  const exe = input.platform === "win32" ? "typst.exe" : "typst";
  const bundledTypst = input.packaged
    ? join(input.resourcesPath, "typst", exe)
    : join(input.repoRoot, "resources", "typst", bundledKey(input.platform, input.arch), exe);
  const bundledPackages = input.packaged ? join(input.resourcesPath, "typst-packages") : join(input.repoRoot, "resources", "typst-packages");

  let typst: string;
  if (input.envTypst) {
    typst = input.envTypst;
  } else if (input.packaged || input.exists(bundledTypst)) {
    // An installed app never falls back to a typst of the system, a missing file is reported as it is.
    typst = bundledTypst;
  } else {
    typst = typstCandidates(input.platform, input.homeDir).find((path) => input.exists(path)) ?? "typst";
  }

  // Without a bundled folder in development typst uses its own cache and downloads what it lacks.
  const packageCachePath = input.envPackages || (input.packaged || input.exists(bundledPackages) ? bundledPackages : undefined);
  return { typst, packageCachePath };
}

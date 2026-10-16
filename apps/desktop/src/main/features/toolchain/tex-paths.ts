import { delimiter, join } from "node:path";

export type TexPathInput = {
  /** Value of MARKTWAIN_TEX_BIN */
  envBin: string | undefined;
  /** Value of the PATH of the process */
  pathEnv: string | undefined;
  platform: NodeJS.Platform;
  homeDir: string;
  /** Value of APPDATA, where TinyTeX is installed on Windows */
  appData: string | undefined;
  exists: (path: string) => boolean;
  /** Names in a folder, empty when it cannot be read */
  listDir: (path: string) => string[];
};

/** The programs that the template needs from a TeX Live, the Windows names end in .exe. */
export const TEX_PROGRAMS = ["xelatex", "latexmk", "texlua"] as const;

function programPath(dir: string, name: string, platform: NodeJS.Platform): string {
  return join(dir, platform === "win32" ? `${name}.exe` : name);
}

/** Whether a folder holds all the programs of the template. */
export function hasTexPrograms(dir: string, exists: (path: string) => boolean, platform: NodeJS.Platform): boolean {
  return TEX_PROGRAMS.every((name) => exists(programPath(dir, name, platform)));
}

/** The programs of a folder that are not there, for the message that says what is missing. */
export function missingTexPrograms(dir: string, exists: (path: string) => boolean, platform: NodeJS.Platform): string[] {
  return TEX_PROGRAMS.filter((name) => !exists(programPath(dir, name, platform)));
}

/** The folders of the form root/<year>/bin/<system>, which is how TeX Live and TinyTeX lay out their binaries. */
function yearBins(root: string, listDir: (path: string) => string[], sub: string): string[] {
  const years = listDir(root).sort().reverse();
  return years.flatMap((year) => {
    const bin = join(root, year, sub);
    return listDir(bin).sort().map((system) => join(bin, system));
  });
}

/**
 * The folders where TeX binaries are usually installed. A GUI app does not inherit the shell PATH on macOS, so the places are probed
 * one by one, the newest year of a TeX Live comes first.
 */
export function texBinCandidates(input: TexPathInput): string[] {
  const fromPath = (input.pathEnv ?? "").split(delimiter).filter((dir) => dir !== "");
  const bins: string[] = [];
  if (input.envBin) bins.push(input.envBin);
  if (input.platform === "darwin") {
    bins.push("/Library/TeX/texbin", ...yearBins("/usr/local/texlive", input.listDir, "bin"));
    bins.push(...listBinSystems(join(input.homeDir, "Library/TinyTeX/bin"), input.listDir));
    bins.push("/opt/homebrew/bin", "/usr/local/bin");
  } else if (input.platform === "linux") {
    bins.push(...yearBins("/usr/local/texlive", input.listDir, "bin"));
    bins.push(...listBinSystems(join(input.homeDir, ".TinyTeX/bin"), input.listDir));
    bins.push("/usr/bin");
  } else if (input.platform === "win32") {
    for (const root of ["C:\\texlive", join(input.homeDir, "texlive")]) bins.push(...yearBins(root, input.listDir, "bin"));
    if (input.appData) bins.push(...listBinSystems(join(input.appData, "TinyTeX", "bin"), input.listDir));
  }
  bins.push(...fromPath);
  return [...new Set(bins)];
}

function listBinSystems(root: string, listDir: (path: string) => string[]): string[] {
  return listDir(root).sort().map((system) => join(root, system));
}

/** The first folder that holds all programs, null when there is none. A folder given by the environment is the only one looked at, so it can also turn LaTeX off. */
export function resolveTexBin(input: TexPathInput): string | null {
  if (input.envBin) return hasTexPrograms(input.envBin, input.exists, input.platform) ? input.envBin : null;
  return texBinCandidates(input).find((dir) => hasTexPrograms(dir, input.exists, input.platform)) ?? null;
}

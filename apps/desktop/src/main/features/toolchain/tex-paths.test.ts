import { describe, expect, it } from "@jest/globals";
import { posix, win32 } from "node:path";
import { missingTexPrograms, resolveTexBin, texBinCandidates, type TexPathInput } from "./tex-paths";

function input(files: string[], tree: Record<string, string[]> = {}, over: Partial<TexPathInput> = {}): TexPathInput {
  return {
    envBin: undefined,
    pathEnv: undefined,
    platform: "darwin",
    homeDir: "/Users/me",
    appData: undefined,
    exists: (path) => files.includes(path),
    listDir: (path) => tree[path] ?? [],
    ...over,
  };
}

const programs = (dir: string, ext = "") => ["xelatex", "latexmk", "texlua"].map((name) => (ext ? win32 : posix).join(dir, `${name}${ext}`));

describe("resolveTexBin", () => {
  it("prefers the folder of the environment", () => {
    const bin = "/opt/tex/bin";
    expect(resolveTexBin(input([...programs(bin), ...programs("/Library/TeX/texbin")], {}, { envBin: bin }))).toBe(bin);
  });

  it("looks only at the folder of the environment when there is one, so that it can turn LaTeX off", () => {
    expect(resolveTexBin(input(programs("/Library/TeX/texbin"), {}, { envBin: "/nowhere" }))).toBeNull();
  });

  it("finds the TeX Live of macOS in the places that a GUI app has no PATH for, the newest year first", () => {
    const tree = { "/usr/local/texlive": ["2025", "2026"], "/usr/local/texlive/2026/bin": ["universal-darwin"], "/usr/local/texlive/2025/bin": ["universal-darwin"] };
    const files = [...programs("/usr/local/texlive/2026/bin/universal-darwin"), ...programs("/usr/local/texlive/2025/bin/universal-darwin")];
    expect(resolveTexBin(input(files, tree))).toBe("/usr/local/texlive/2026/bin/universal-darwin");
  });

  it("finds TinyTeX in the home folder", () => {
    const tree = { "/Users/me/Library/TinyTeX/bin": ["universal-darwin"] };
    expect(resolveTexBin(input(programs("/Users/me/Library/TinyTeX/bin/universal-darwin"), tree))).toBe("/Users/me/Library/TinyTeX/bin/universal-darwin");
  });

  it("reads the PATH after the usual places", () => {
    const found = resolveTexBin(input(programs("/custom/bin"), {}, { pathEnv: "/usr/bin:/custom/bin" }));
    expect(found).toBe("/custom/bin");
  });

  it("needs all three programs in one folder", () => {
    expect(resolveTexBin(input(["/Library/TeX/texbin/xelatex"]))).toBeNull();
    expect(missingTexPrograms("/Library/TeX/texbin", (p) => p.endsWith("xelatex"), "darwin")).toEqual(["latexmk", "texlua"]);
  });

  it("uses the exe names and the folders of Windows", () => {
    const tree = { "C:\\texlive": ["2026"], [win32.join("C:\\texlive", "2026", "bin")]: ["windows"], [win32.join("C:\\Users\\me\\AppData\\Roaming", "TinyTeX", "bin")]: ["windows"] };
    const bin = win32.join("C:\\texlive", "2026", "bin", "windows");
    expect(resolveTexBin(input(programs(bin, ".exe"), tree, { platform: "win32", homeDir: "C:\\Users\\me", appData: "C:\\Users\\me\\AppData\\Roaming" }))).toBe(bin);
    expect(texBinCandidates(input([], tree, { platform: "win32", homeDir: "C:\\Users\\me", appData: "C:\\Users\\me\\AppData\\Roaming" }))).toContain(
      win32.join("C:\\Users\\me\\AppData\\Roaming", "TinyTeX", "bin", "windows"),
    );
  });
});

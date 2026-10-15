import { describe, expect, it } from "@jest/globals";
import { join } from "node:path";
import { bundledKey, resolveTypstPaths, type TypstPathInput } from "./typst-paths";

const RES = "/Apps/MarkTwain/Resources";
const REPO = "/work/MarkTwain";

function input(overrides: Partial<TypstPathInput> = {}): TypstPathInput {
  return {
    envTypst: undefined,
    envPackages: undefined,
    packaged: true,
    resourcesPath: RES,
    repoRoot: REPO,
    platform: "darwin",
    arch: "arm64",
    homeDir: "/home/me",
    exists: () => false,
    ...overrides,
  };
}

describe("bundledKey", () => {
  it("matches the os and arch macros of electron-builder", () => {
    expect(bundledKey("darwin", "arm64")).toBe("mac-arm64");
    expect(bundledKey("darwin", "x64")).toBe("mac-x64");
    expect(bundledKey("win32", "x64")).toBe("win-x64");
    expect(bundledKey("linux", "x64")).toBe("linux-x64");
  });
});

describe("resolveTypstPaths", () => {
  it("uses the bundled binary and packages of an installed app", () => {
    expect(resolveTypstPaths(input())).toEqual({
      typst: join(RES, "typst", "typst"),
      packageCachePath: join(RES, "typst-packages"),
    });
  });

  it("uses typst.exe on Windows", () => {
    expect(resolveTypstPaths(input({ platform: "win32", arch: "x64" })).typst).toBe(join(RES, "typst", "typst.exe"));
  });

  it("lets the environment win over the bundled files", () => {
    const paths = resolveTypstPaths(input({ envTypst: "/opt/typst", envPackages: "/opt/packages" }));
    expect(paths).toEqual({ typst: "/opt/typst", packageCachePath: "/opt/packages" });
  });

  it("never falls back to a typst of the system when installed", () => {
    const paths = resolveTypstPaths(input({ exists: (path) => path === "/opt/homebrew/bin/typst" }));
    expect(paths.typst).toBe(join(RES, "typst", "typst"));
  });

  it("uses the fetched binary of the repository during development", () => {
    const bundled = join(REPO, "resources", "typst", "mac-arm64", "typst");
    const paths = resolveTypstPaths(input({ packaged: false, exists: (path) => path === bundled || path === join(REPO, "resources", "typst-packages") }));
    expect(paths).toEqual({ typst: bundled, packageCachePath: join(REPO, "resources", "typst-packages") });
  });

  it("falls back to the usual places during development, then to PATH", () => {
    const usual = resolveTypstPaths(input({ packaged: false, exists: (path) => path === "/usr/local/bin/typst" }));
    expect(usual).toEqual({ typst: "/usr/local/bin/typst", packageCachePath: undefined });
    expect(resolveTypstPaths(input({ packaged: false })).typst).toBe("typst");
    expect(resolveTypstPaths(input({ packaged: false, platform: "win32", arch: "x64" })).typst).toBe("typst");
  });

  it("keeps the environment package folder even when nothing is bundled", () => {
    expect(resolveTypstPaths(input({ packaged: false, envPackages: "/opt/packages" })).packageCachePath).toBe("/opt/packages");
  });
});

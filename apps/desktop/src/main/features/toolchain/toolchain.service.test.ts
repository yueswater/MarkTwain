import { describe, expect, it } from "@jest/globals";
import { ToolchainService } from "./toolchain.service";
import type { BuildPaths } from "./build-paths";

const paths = (tex: BuildPaths["tex"]): (() => BuildPaths) => () => ({ typst: "typst", templateDir: "/t", tex });
const found = async () => ({ code: 0, stdout: "/tex/texmf/scripts/citation-style-language/citeproc-lua.lua\n", stderr: "" });
const absent = async () => ({ code: 1, stdout: "", stderr: "" });

describe("ToolchainService.latex", () => {
  it("is available with a TeX Live, the package and the template", async () => {
    expect(await new ToolchainService(paths({ bin: "/tex/bin", templateDir: "/tex-template" }), found, () => true).latex()).toEqual({ available: true, missing: [] });
  });

  it("says that no TeX Live was found", async () => {
    expect(await new ToolchainService(paths({ bin: null, templateDir: "/tex-template" }), found, () => true).latex()).toEqual({ available: false, missing: ["tex"] });
    expect((await new ToolchainService(paths(undefined), found, () => true).latex()).missing).toEqual(["tex", "template"]);
  });

  it("says that the package of the bibliography is missing, and that the template is", async () => {
    expect((await new ToolchainService(paths({ bin: "/tex/bin", templateDir: "/x" }), absent, () => true).latex()).missing).toEqual(["citation-style-language"]);
    expect((await new ToolchainService(paths({ bin: "/tex/bin", templateDir: "/x" }), found, () => false).latex()).missing).toEqual(["template"]);
  });
});

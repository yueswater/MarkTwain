import { existsSync } from "node:fs";
import { run, texEnvironment } from "@marktwain/build";
import type { LatexStatus } from "../../../shared/ipc";
import type { BuildPaths } from "./build-paths";

type Runner = typeof run;

/** Finds out what the machine can do, so that the interface offers only what works. */
export class ToolchainService {
  constructor(
    private readonly paths: () => BuildPaths,
    private readonly runner: Runner = run,
    private readonly exists: (path: string) => boolean = existsSync,
  ) {}

  /** LaTeX needs a TeX Live with the three programs and the package that formats the bibliography. */
  async latex(): Promise<LatexStatus> {
    const tex = this.paths().tex;
    const missing: LatexStatus["missing"] = [];
    if (!tex?.bin) {
      missing.push("tex");
    } else {
      const found = await this.runner("kpsewhich", ["citation-style-language/citeproc-lua.lua"], tex.bin, 20_000, texEnvironment(tex.bin));
      if (found.code !== 0 || found.stdout.trim() === "") missing.push("citation-style-language");
    }
    if (!tex || !this.exists(tex.templateDir)) missing.push("template");
    return { available: missing.length === 0, missing };
  }
}

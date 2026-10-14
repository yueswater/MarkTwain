import { app, protocol } from "electron";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { PREVIEW_SCHEME, TEMPLATE_DIR_ENV, TYPST_PATH_ENV } from "../../config/app.config";
import { handle } from "../../core/ipc";
import type { BuildPaths, BuildService } from "./build.service";

/** Places where typst is usually installed, a GUI app does not inherit the shell PATH. */
function typstCandidates(): string[] {
  if (process.platform === "darwin") return ["/opt/homebrew/bin/typst", "/usr/local/bin/typst", join(homedir(), ".cargo/bin/typst")];
  if (process.platform === "linux") return ["/usr/bin/typst", "/usr/local/bin/typst", join(homedir(), ".cargo/bin/typst")];
  return [];
}

/** The typst executable and template folder, overridable for tests and development. */
export function resolveBuildPaths(): BuildPaths {
  const root = app.isPackaged ? process.resourcesPath : resolve(app.getAppPath(), "../..");
  return {
    typst: process.env[TYPST_PATH_ENV] || typstCandidates().find((path) => existsSync(path)) || "typst",
    templateDir: process.env[TEMPLATE_DIR_ENV] || join(root, "resources", "templates", "typ"),
  };
}

export function registerBuildController(service: BuildService): void {
  handle(IpcChannel.BuildTypst, () => service.build());

  // marktwain-preview://page/<revision>/<index>.png
  protocol.handle(PREVIEW_SCHEME, (request) => {
    const match = /\/(\d+)\.png$/.exec(new URL(request.url).pathname);
    const page = match ? service.page(Number(match[1])) : null;
    if (!page) return new Response(null, { status: 404 });
    return new Response(page as unknown as BodyInit, { headers: { "content-type": "image/png", "cache-control": "no-store" } });
  });
}

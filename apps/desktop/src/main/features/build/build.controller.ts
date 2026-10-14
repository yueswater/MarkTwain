import { app, protocol } from "electron";
import { join, resolve } from "node:path";
import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { PREVIEW_SCHEME, TEMPLATE_DIR_ENV, TYPST_PATH_ENV } from "../../config/app.config";
import { handle } from "../../core/ipc";
import type { BuildPaths, BuildService } from "./build.service";

/** The typst executable and template folder, overridable for tests and development. */
export function resolveBuildPaths(): BuildPaths {
  const root = app.isPackaged ? process.resourcesPath : resolve(app.getAppPath(), "../..");
  return {
    typst: process.env[TYPST_PATH_ENV] || "typst",
    templateDir: process.env[TEMPLATE_DIR_ENV] || join(root, "resources", "templates", "typ"),
  };
}

export function registerBuildController(service: BuildService): void {
  handle(IpcChannel.BuildTypst, () => service.build());

  protocol.handle(PREVIEW_SCHEME, () => {
    const pdf = service.latestPdf();
    if (!pdf) return new Response(null, { status: 404 });
    return new Response(pdf as unknown as BodyInit, { headers: { "content-type": "application/pdf" } });
  });
}

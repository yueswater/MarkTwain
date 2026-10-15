import { app, protocol } from "electron";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { PREVIEW_SCHEME, TEMPLATE_DIR_ENV, TYPST_PACKAGES_ENV, TYPST_PATH_ENV } from "../../config/app.config";
import { handle } from "../../core/ipc";
import type { BuildPaths, BuildService } from "./build.service";
import { resolveTypstPaths } from "./typst-paths";

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

/** The engine of the PDF viewer, packaged next to the app so the preview works offline. */
function pdfiumPath(): string {
  return app.isPackaged ? join(process.resourcesPath, "pdfium.wasm") : join(app.getAppPath(), "node_modules", "@embedpdf", "snippet", "dist", "pdfium.wasm");
}

export function registerBuildController(service: BuildService): void {
  handle(IpcChannel.BuildTypst, () => service.build());
  handle(IpcChannel.BuildSetWatermark, ({ on }) => service.setWatermark(on));

  // marktwain-preview://pdf/<revision>.pdf is the latest build, marktwain-preview://wasm/pdfium.wasm is the engine of the viewer
  protocol.handle(PREVIEW_SCHEME, (request) => {
    const url = new URL(request.url);
    if (url.hostname === "wasm") {
      const path = pdfiumPath();
      if (!existsSync(path)) return new Response(null, { status: 404 });
      return new Response(readFileSync(path) as unknown as BodyInit, { headers: { "content-type": "application/wasm", "cache-control": "max-age=3600" } });
    }
    const pdf = /\/\d+\.pdf$/.test(url.pathname) ? service.latestPdf() : null;
    if (!pdf) return new Response(null, { status: 404 });
    return new Response(pdf as unknown as BodyInit, { headers: { "content-type": "application/pdf", "cache-control": "no-store" } });
  });
}

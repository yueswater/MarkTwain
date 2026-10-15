import { app, protocol } from "electron";
import { existsSync, readFileSync } from "node:fs";
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

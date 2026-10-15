import { app, protocol } from "electron";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { IpcChannel } from "../../../shared/enums/ipc-channel.enum";
import { PREVIEW_SCHEME } from "../../config/app.config";
import { handle } from "../../core/ipc";
import type { BuildService } from "./build.service";

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

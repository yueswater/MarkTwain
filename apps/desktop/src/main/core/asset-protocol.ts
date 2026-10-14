import { protocol } from "electron";
import { ASSET_SCHEME, PREVIEW_SCHEME } from "../config/app.config";

/** Must run before app ready, declares the protocol standard and secure so images can load in the page. */
export function declareAssetScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: ASSET_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
    { scheme: PREVIEW_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
  ]);
}

type Reader = (path: string) => { data: Uint8Array; mime: string } | null;

/** Runs after app ready, serves marktwain-asset://project/images/x.png from the files table of the open project. */
export function handleAssetProtocol(read: Reader): void {
  protocol.handle(ASSET_SCHEME, (request) => {
    const path = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, "");
    const file = read(path);
    if (!file) return new Response(null, { status: 404 });
    return new Response(file.data as unknown as BodyInit, { headers: { "content-type": file.mime } });
  });
}

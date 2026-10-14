import { protocol } from "electron";
import { ASSET_SCHEME, PREVIEW_SCHEME } from "../config/app.config";

/** 必須在 app ready 之前呼叫：宣告這個協定是標準、安全的，圖片才能在頁面裡載入。 */
export function declareAssetScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: ASSET_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
    { scheme: PREVIEW_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
  ]);
}

type Reader = (path: string) => { data: Uint8Array; mime: string } | null;

/** app ready 之後呼叫：`marktwain-asset://project/images/x.png` 由目前專案的 files 表提供。 */
export function handleAssetProtocol(read: Reader): void {
  protocol.handle(ASSET_SCHEME, (request) => {
    const path = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, "");
    const file = read(path);
    if (!file) return new Response(null, { status: 404 });
    return new Response(file.data as unknown as BodyInit, { headers: { "content-type": file.mime } });
  });
}

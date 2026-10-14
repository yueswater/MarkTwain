import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { extname } from "node:path";
import { ErrorCode } from "../../../shared/enums/error-code.enum";
import { IMAGE_EXTENSIONS, IMAGE_MAX_BYTES } from "../../config/app.config";
import type { DatabaseSession } from "../../core/database-session";
import { AppError } from "../../core/errors";
import { AssetRepository } from "./asset.repository";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
};

export function mimeFor(path: string): string {
  return MIME[extname(path).slice(1).toLowerCase()] ?? "application/octet-stream";
}

export class AssetService {
  constructor(
    private readonly session: DatabaseSession,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * 把磁碟上的圖片存進專案，路徑由內容的雜湊決定（同一張圖只存一份），
   * 所以專案可以整個搬走，文件裡的路徑仍然有效。
   */
  importImage(filePath: string): string {
    const ext = extname(filePath).slice(1).toLowerCase();
    if (!(IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
      throw new AppError(ErrorCode.AssetUnsupported);
    }
    let data: Buffer;
    try {
      if (statSync(filePath).size > IMAGE_MAX_BYTES) {
        throw new AppError(ErrorCode.AssetTooLarge, { max: String(IMAGE_MAX_BYTES / 1024 / 1024) });
      }
      data = readFileSync(filePath);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCode.AssetUnreadable);
    }
    const hash = createHash("sha256").update(data).digest("hex").slice(0, 16);
    const path = `images/${hash}.${ext === "jpeg" ? "jpg" : ext}`;
    new AssetRepository(this.session.db).put(path, data, this.now().getTime());
    return path;
  }

  /** 讀取專案內的檔案；沒有開啟的專案或找不到時回傳 null（給協定處理器用，不丟例外）。 */
  read(path: string): { data: Uint8Array; mime: string } | null {
    if (!this.session.isOpen) return null;
    const data = new AssetRepository(this.session.db).get(path);
    return data ? { data, mime: mimeFor(path) } : null;
  }
}

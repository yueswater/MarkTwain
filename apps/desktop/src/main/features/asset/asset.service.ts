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

  /** Every file of the project, for the versions to keep. */
  readAllFiles(): { path: string; data: Uint8Array; updatedAt: number }[] {
    return new AssetRepository(this.session.db).all().map((row) => ({ path: row.path, data: row.data, updatedAt: row.updated_at }));
  }

  /** Makes the files exactly these. It does not open a transaction, the caller does. */
  replaceAllFiles(files: { path: string; data: Uint8Array }[]): void {
    const repository = new AssetRepository(this.session.db);
    const keep = new Set(files.map((file) => file.path));
    for (const path of repository.paths()) if (!keep.has(path)) repository.delete(path);
    const updatedAt = this.now().getTime();
    for (const file of files) repository.put(file.path, file.data, updatedAt);
  }

  /**
   * Stores an image from disk in the project, the path comes from a hash of the content so one image is stored once.
   * That makes a project movable while paths in documents stay valid.
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

  /** Stores PNG bytes from the editor, the path comes from the hash like it does for imported images. */
  storePng(data: Uint8Array): string {
    const png = Buffer.from(data);
    const isPng = png.length > 8 && png.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (!isPng) throw new AppError(ErrorCode.AssetUnsupported);
    if (png.length > IMAGE_MAX_BYTES) throw new AppError(ErrorCode.AssetTooLarge, { max: String(IMAGE_MAX_BYTES / 1024 / 1024) });
    const hash = createHash("sha256").update(png).digest("hex").slice(0, 16);
    const path = `images/${hash}.png`;
    new AssetRepository(this.session.db).put(path, png, this.now().getTime());
    return path;
  }

  /** Reads a project file, returns null instead of throwing when no project is open or the file is missing, for the protocol handler. */
  read(path: string): { data: Uint8Array; mime: string } | null {
    if (!this.session.isOpen) return null;
    const data = new AssetRepository(this.session.db).get(path);
    return data ? { data, mime: mimeFor(path) } : null;
  }
}

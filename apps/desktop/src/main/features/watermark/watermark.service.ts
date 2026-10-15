import { renderThumbnail } from "@marktwain/build";
import { existsSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { ErrorCode } from "../../../shared/enums/error-code.enum";
import type { WatermarkInfo, WatermarkMode, WatermarkPicture } from "../../../shared/ipc";
import { WATERMARK_EXTENSIONS, WATERMARK_MAX_BYTES } from "../../config/app.config";
import type { DatabaseSession } from "../../core/database-session";
import { AppError } from "../../core/errors";
import type { BuildPaths } from "../toolchain/build-paths";
import type { ConfigService } from "../config/config.service";
import type { DialogService } from "../dialog/dialog.service";

const PREFIX = "watermarks/";
/** Where config.yml names a watermark, relative to the root of the thesis folder. */
const CONFIG_DIR = "/assets/watermarks/";

type Thumbnail = typeof renderThumbnail;

/** The watermark of the thesis: the one of the school, none, or an image kept in the project. */
export class WatermarkService {
  private readonly thumbnails = new Map<string, string | null>();

  constructor(
    private readonly session: DatabaseSession,
    private readonly config: ConfigService,
    private readonly paths: () => BuildPaths,
    private readonly now: () => Date = () => new Date(),
    private readonly thumbnail: Thumbnail = renderThumbnail,
    private readonly workDir: string = tmpdir(),
  ) {}

  /** Files of the project that config.yml can name, for the build. */
  files(): { path: string; data: Uint8Array }[] {
    return this.session.db
      .all<{ path: string; data: Uint8Array }>("SELECT path, data FROM files WHERE path LIKE 'watermarks/%'")
      .map((row) => ({ path: row.path.slice(PREFIX.length), data: row.data }));
  }

  async info(): Promise<WatermarkInfo> {
    const { values, inherited } = this.config.advanced();
    const image = values["watermark.image"];
    const mode: WatermarkMode = image === undefined ? "school" : image === "none" ? "none" : "custom";

    const schoolImage = inherited["watermark.image"];
    const school = typeof schoolImage === "string" ? await this.picture(basename(schoolImage), this.templateBytes(schoolImage)) : null;
    // The image of the project is shown also while it is not in use, so the author can switch back to it
    const named = typeof image === "string" && image !== "none" ? image : null;
    const stored = named ?? this.files()[0]?.path ?? null;
    const custom = stored ? await this.picture(basename(stored), this.customBytes(stored)) : null;
    const number = (path: string, fallback: number) => {
      const value = values[path] ?? inherited[path];
      return typeof value === "number" ? value : fallback;
    };
    return { mode, school, custom, width: number("watermark.width", 100), opacity: number("watermark.opacity", 100) };
  }

  /** Stores an image or a PDF as the watermark of this project and sets it in the settings. */
  async choose(dialogs: Pick<DialogService, "chooseWatermark">): Promise<WatermarkInfo | null> {
    const path = await dialogs.chooseWatermark();
    if (!path) return null;
    const ext = extname(path).slice(1).toLowerCase();
    if (!(WATERMARK_EXTENSIONS as readonly string[]).includes(ext)) throw new AppError(ErrorCode.AssetUnsupported);
    let data: Buffer;
    try {
      if (statSync(path).size > WATERMARK_MAX_BYTES) throw new AppError(ErrorCode.AssetTooLarge, { max: String(WATERMARK_MAX_BYTES / 1024 / 1024) });
      data = readFileSync(path);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCode.AssetUnreadable);
    }
    const name = `${basename(path, extname(path)).replace(/[^A-Za-z0-9_-]/g, "_") || "watermark"}.${ext === "jpeg" ? "jpg" : ext}`;
    const db = this.session.db;
    db.run("DELETE FROM files WHERE path LIKE 'watermarks/%' AND path != ?", [PREFIX + name]);
    db.run(
      "INSERT INTO files (path, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(path) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
      [PREFIX + name, data, this.now().getTime()],
    );
    this.thumbnails.delete(name);
    this.config.setAdvanced({ "watermark.image": CONFIG_DIR + name });
    return this.info();
  }

  private templateBytes(configPath: string): Uint8Array | null {
    const file = join(this.paths().templateDir, configPath.replace(/^\//, ""));
    return existsSync(file) ? readFileSync(file) : null;
  }

  private customBytes(configPath: string): Uint8Array | null {
    const name = basename(configPath);
    const row = this.session.db.get<{ data: Uint8Array }>("SELECT data FROM files WHERE path = ?", [PREFIX + name]);
    return row?.data ?? this.templateBytes(configPath);
  }

  private async picture(name: string, data: Uint8Array | null): Promise<WatermarkPicture | null> {
    if (!data) return null;
    const key = `${name}:${data.length}`;
    if (!this.thumbnails.has(key)) {
      const { typst, packageCachePath } = this.paths();
      const png = await this.thumbnail({ typst, packageCachePath, workDir: this.workDir, name, data, width: 200 });
      this.thumbnails.set(key, png ? `data:image/png;base64,${Buffer.from(png).toString("base64")}` : null);
    }
    return { name, thumbnail: this.thumbnails.get(key) ?? null };
  }
}

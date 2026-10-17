import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { ErrorCode } from "../../../shared/enums/error-code.enum";
import type { FileEntry, FileListing, FilePlace } from "../../../shared/ipc/files";
import { AppError } from "../../core/errors";

const FORBIDDEN_NAME = /[\\/:*?"<>|]/;
const collator = new Intl.Collator("zh-Hant-TW", { numeric: true });

type Options = {
  home?: string;
  platform?: NodeJS.Platform;
  /** Where the picker opens when no folder is asked for, the test hook sets it */
  start?: () => string | undefined;
};

/** What the file picker of the app reads and makes on the disk. */
export class FilesService {
  private readonly home: string;
  private readonly platform: NodeJS.Platform;
  private readonly start: () => string | undefined;

  constructor(options: Options = {}) {
    this.home = options.home ?? homedir();
    this.platform = options.platform ?? process.platform;
    this.start = options.start ?? (() => undefined);
  }

  list(path: string | null, extension: string | null): FileListing {
    const folder = this.resolveFolder(path);
    const entries: FileEntry[] = [];
    let readable = true;
    try {
      const suffix = extension ? `.${extension.toLowerCase()}` : null;
      for (const item of readdirSync(folder, { withFileTypes: true })) {
        if (item.name.startsWith(".")) continue;
        const kind = this.kindOf(join(folder, item.name), item);
        if (kind === "dir") entries.push({ name: item.name, kind });
        else if (kind === "file" && suffix && item.name.toLowerCase().endsWith(suffix)) entries.push({ name: item.name, kind });
      }
    } catch {
      readable = false;
    }
    entries.sort((a, b) => (a.kind === b.kind ? collator.compare(a.name, b.name) : a.kind === "dir" ? -1 : 1));
    const above = dirname(folder);
    return { path: folder, parent: above === folder ? null : above, entries, places: this.places(), readable };
  }

  makeFolder(parent: string, name: string): string {
    const clean = name.trim();
    if (clean === "" || clean === "." || clean === ".." || FORBIDDEN_NAME.test(clean)) throw new AppError(ErrorCode.FilesInvalidName);
    const target = join(parent, clean);
    if (existsSync(target)) throw new AppError(ErrorCode.FilesFolderExists);
    try {
      mkdirSync(target);
    } catch {
      throw new AppError(ErrorCode.FilesFolderFailed);
    }
    return target;
  }

  private resolveFolder(path: string | null): string {
    for (const candidate of [path, this.start(), join(this.home, "Documents"), this.home]) {
      if (candidate && this.isFolder(candidate)) return candidate;
    }
    return this.home;
  }

  private isFolder(path: string): boolean {
    try {
      return statSync(path).isDirectory();
    } catch {
      return false;
    }
  }

  private kindOf(path: string, item: { isDirectory(): boolean; isFile(): boolean; isSymbolicLink(): boolean }): "dir" | "file" | null {
    if (item.isDirectory()) return "dir";
    if (item.isFile()) return "file";
    if (!item.isSymbolicLink()) return null;
    try {
      const target = statSync(path);
      return target.isDirectory() ? "dir" : target.isFile() ? "file" : null;
    } catch {
      return null;
    }
  }

  private places(): FilePlace[] {
    const places: FilePlace[] = [{ id: "home", path: this.home }];
    for (const [id, name] of [["desktop", "Desktop"], ["documents", "Documents"], ["downloads", "Downloads"]] as const) {
      const path = join(this.home, name);
      if (this.isFolder(path)) places.push({ id, path });
    }
    if (this.platform === "win32") {
      for (let code = 65; code <= 90; code += 1) {
        const path = `${String.fromCharCode(code)}:\\`;
        if (existsSync(path)) places.push({ id: "drive", path });
      }
    }
    return places;
  }
}

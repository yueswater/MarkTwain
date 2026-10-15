import { ASSET_PATTERN, PACKAGE_NAME_PATTERN, PLATFORM_KEYS, SHA256_PATTERN, VERSION_PATTERN } from "./config";
import type { PackageEntry, PlatformEntry, PlatformKey, TypstLock } from "./types";

export function parseLock(text: string): TypstLock {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("typst.lock.json 不是有效的 JSON");
  }

  const root = data as { version?: unknown; platforms?: Record<string, unknown>; packages?: unknown } | null;
  if (typeof root?.version !== "string" || !VERSION_PATTERN.test(root.version)) {
    throw new Error('typst.lock.json 的 "version" 應為 x.y.z');
  }
  if (!root.platforms || typeof root.platforms !== "object") {
    throw new Error('typst.lock.json 缺少 "platforms"');
  }

  const platforms = {} as Record<PlatformKey, PlatformEntry>;
  for (const key of PLATFORM_KEYS) {
    const entry = root.platforms[key] as Partial<PlatformEntry> | undefined;
    if (!entry || typeof entry !== "object") {
      throw new Error(`typst.lock.json 缺少 "${key}"`);
    }
    if (typeof entry.asset !== "string" || !ASSET_PATTERN.test(entry.asset)) {
      throw new Error(`"${key}".asset 應為 .tar.xz 或 .zip 檔名`);
    }
    if (typeof entry.sha256 !== "string" || !SHA256_PATTERN.test(entry.sha256)) {
      throw new Error(`"${key}".sha256 應為 64 位小寫十六進位`);
    }
    platforms[key] = { asset: entry.asset, sha256: entry.sha256 };
  }

  if (!Array.isArray(root.packages)) {
    throw new Error('typst.lock.json 缺少 "packages"');
  }
  const packages = root.packages.map((raw, index): PackageEntry => {
    const entry = raw as Partial<PackageEntry> | null;
    if (typeof entry?.name !== "string" || !PACKAGE_NAME_PATTERN.test(entry.name)) {
      throw new Error(`packages[${index}].name 格式錯誤`);
    }
    if (typeof entry.version !== "string" || !VERSION_PATTERN.test(entry.version)) {
      throw new Error(`packages[${index}].version 應為 x.y.z`);
    }
    if (typeof entry.sha256 !== "string" || !SHA256_PATTERN.test(entry.sha256)) {
      throw new Error(`packages[${index}].sha256 應為 64 位小寫十六進位`);
    }
    return { name: entry.name, version: entry.version, sha256: entry.sha256 };
  });

  return { version: root.version, platforms, packages };
}

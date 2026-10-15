import { createHash } from "node:crypto";
import { PACKAGE_BASE, PLATFORM_KEYS, RELEASE_BASE } from "./config";
import type { Marker, PackageEntry, PlatformEntry, PlatformKey } from "./types";

/** The key of the platform the script runs on, or null when no binary is pinned for it. */
export function hostKey(platform: string, arch: string): PlatformKey | null {
  const os = platform === "darwin" ? "mac" : platform === "win32" ? "win" : platform === "linux" ? "linux" : null;
  const key = `${os}-${arch}` as PlatformKey;
  return os !== null && PLATFORM_KEYS.includes(key) ? key : null;
}

export function binaryName(key: PlatformKey): string {
  return key.startsWith("win-") ? "typst.exe" : "typst";
}

export function assetUrl(version: string, entry: PlatformEntry): string {
  return `${RELEASE_BASE}/v${version}/${entry.asset}`;
}

export function packageUrl(entry: PackageEntry): string {
  return `${PACKAGE_BASE}/${entry.name}-${entry.version}.tar.gz`;
}

/** Name of the folder the release archive holds its files in, which is the asset name without the extension. */
export function archiveStem(asset: string): string {
  return asset.replace(/\.(tar\.xz|zip)$/, "");
}

export function sha256Of(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

export function verifySha256(data: Uint8Array, expected: string, label: string): void {
  const actual = sha256Of(data);
  if (actual !== expected) {
    throw new Error(`${label}: sha256 不符，鎖定檔為 ${expected}，下載的內容為 ${actual}`);
  }
}

export function isUpToDate(marker: unknown, version: string, sha256: string): boolean {
  if (typeof marker !== "object" || marker === null) return false;
  const m = marker as Partial<Marker>;
  return m.version === version && m.sha256 === sha256;
}

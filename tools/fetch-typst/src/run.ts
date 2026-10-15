import { execFileSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MARKER_FILE, PACKAGE_NAMESPACE } from "./config";
import { archiveStem, assetUrl, binaryName, isUpToDate, packageUrl, verifySha256 } from "./fetch";
import type { PackageEntry, PlatformEntry, PlatformKey } from "./types";

type Result = "skipped" | "fetched";

function readMarker(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function writeMarker(dir: string, version: string, sha256: string): void {
  writeFileSync(join(dir, MARKER_FILE), `${JSON.stringify({ version, sha256 }, null, 2)}\n`);
}

async function download(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`下載失敗 ${url}（HTTP ${response.status}）`);
  return new Uint8Array(await response.arrayBuffer());
}

/** On Windows the tar of the system reads zip files, a tar from Git for Windows may come first in PATH and cannot. */
function tarCommand(): string {
  return process.platform === "win32" ? join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe") : "tar";
}

function extract(archive: string, into: string): void {
  try {
    execFileSync(tarCommand(), ["-xf", archive, "-C", into], { stdio: "inherit" });
  } catch (error) {
    throw new Error(`解壓縮失敗，Linux 需要安裝 xz-utils：${(error as Error).message}`);
  }
}

export async function fetchTypst(key: PlatformKey, version: string, entry: PlatformEntry, typstDir: string): Promise<Result> {
  const dest = join(typstDir, key);
  const binary = join(dest, binaryName(key));
  if (existsSync(binary) && isUpToDate(readMarker(join(dest, MARKER_FILE)), version, entry.sha256)) {
    return "skipped";
  }

  const tmp = mkdtempSync(join(tmpdir(), "marktwain-typst-"));
  try {
    const data = await download(assetUrl(version, entry));
    verifySha256(data, entry.sha256, entry.asset);

    const archive = join(tmp, entry.asset);
    writeFileSync(archive, data);
    const out = join(tmp, "out");
    mkdirSync(out);
    extract(archive, out);

    const extracted = join(out, archiveStem(entry.asset), binaryName(key));
    if (!existsSync(extracted)) throw new Error(`${entry.asset} 內找不到 ${binaryName(key)}`);

    rmSync(dest, { recursive: true, force: true });
    mkdirSync(dest, { recursive: true });
    cpSync(extracted, binary);
    chmodSync(binary, 0o755);
    writeMarker(dest, version, entry.sha256);
    return "fetched";
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export async function fetchPackage(entry: PackageEntry, packagesDir: string): Promise<Result> {
  const dest = join(packagesDir, PACKAGE_NAMESPACE, entry.name, entry.version);
  if (existsSync(dest) && isUpToDate(readMarker(join(dest, MARKER_FILE)), entry.version, entry.sha256)) {
    return "skipped";
  }

  const tmp = mkdtempSync(join(tmpdir(), "marktwain-typst-pkg-"));
  try {
    const data = await download(packageUrl(entry));
    verifySha256(data, entry.sha256, `${entry.name}-${entry.version}`);

    const archive = join(tmp, "package.tar.gz");
    writeFileSync(archive, data);
    rmSync(dest, { recursive: true, force: true });
    mkdirSync(dest, { recursive: true });
    extract(archive, dest);
    writeMarker(dest, entry.version, entry.sha256);
    return "fetched";
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

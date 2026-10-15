import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { LOCK_FILE, PACKAGES_DIR, PLATFORM_KEYS, TYPST_DIR } from "./config";
import { hostKey } from "./fetch";
import { parseLock } from "./lock";
import { fetchPackage, fetchTypst } from "./run";

// This file is in tools/fetch-typst/src/, three levels up is the repo root.
const root = fileURLToPath(new URL("../../../", import.meta.url));

try {
  const lock = parseLock(readFileSync(join(root, LOCK_FILE), "utf8"));
  const typstDir = join(root, ...TYPST_DIR);
  const packagesDir = join(root, ...PACKAGES_DIR);

  // By default only the platform of this machine is fetched, `--all` fetches the four of the installers.
  const all = process.argv.includes("--all");
  const host = hostKey(process.platform, process.arch);
  if (!all && host === null) {
    throw new Error(`沒有 ${process.platform}-${process.arch} 的 Typst 執行檔，支援 ${PLATFORM_KEYS.join("、")}`);
  }
  const keys = all || host === null ? PLATFORM_KEYS : [host];

  for (const key of keys) {
    const result = await fetchTypst(key, lock.version, lock.platforms[key], typstDir);
    console.log(`typst ${key}: ${result}（${lock.version}）`);
  }
  for (const entry of lock.packages) {
    const result = await fetchPackage(entry, packagesDir);
    console.log(`@preview/${entry.name}:${entry.version}: ${result}`);
  }
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

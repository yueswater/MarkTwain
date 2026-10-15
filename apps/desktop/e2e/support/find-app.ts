import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

/** Finds the executable made by electron-builder --dir, folder names differ per platform and architecture. */
export function findPackagedExecutable(distDir: string): string {
  const candidates: string[] = [];

  if (process.platform === "win32") {
    candidates.push(join(distDir, "win-unpacked", "MarkTwain.exe"));
  } else if (process.platform === "darwin") {
    for (const entry of existsSync(distDir) ? readdirSync(distDir) : []) {
      if (entry.startsWith("mac")) {
        candidates.push(join(distDir, entry, "MarkTwain.app", "Contents", "MacOS", "MarkTwain"));
      }
    }
  } else {
    candidates.push(
      join(distDir, "linux-unpacked", "marktwain"),
      join(distDir, "linux-unpacked", "MarkTwain"),
    );
  }

  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    const present = existsSync(distDir) ? readdirSync(distDir).join(", ") : "（dist 不存在）";
    throw new Error(
      `找不到打包後的程式。已檢查：\n${candidates.join("\n")}\ndist 內有：${present}\n（先執行 pnpm build:unpacked）`,
    );
  }
  return found;
}

/** The Typst that the installed app carries, so the tests need no Typst on the machine. */
export function findBundledTypst(distDir: string): string {
  const executable = findPackagedExecutable(distDir);
  const resources = process.platform === "darwin" ? join(dirname(executable), "..", "Resources") : join(dirname(executable), "resources");
  return join(resources, "typst", process.platform === "win32" ? "typst.exe" : "typst");
}

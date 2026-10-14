import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** 找出 `electron-builder --dir` 產生的可執行檔；各平台與架構的資料夾名稱不同。 */
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
    throw new Error(
      `找不到打包後的程式。已檢查：\n${candidates.join("\n")}\n（先執行 pnpm build:unpacked）`,
    );
  }
  return found;
}

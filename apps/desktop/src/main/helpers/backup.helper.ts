/** 升級舊版專案檔前的備份檔名：`<原檔>.bak-YYYYMMDD-HHmmss`（UTC）。 */
export function createBackupPath(path: string, now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`;
  const time = `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
  return `${path}.bak-${date}-${time}`;
}

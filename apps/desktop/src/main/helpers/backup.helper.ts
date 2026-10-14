/** Backup name before upgrading an old project file, <file>.bak-YYYYMMDD-HHmmss in UTC. */
export function createBackupPath(path: string, now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`;
  const time = `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
  return `${path}.bak-${date}-${time}`;
}

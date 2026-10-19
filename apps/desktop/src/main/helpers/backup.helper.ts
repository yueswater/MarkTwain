import { copyFileSync, readdirSync, rmSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/** How many backups of a project file are kept, the newest by schema version. */
export const BACKUPS_KEPT = 3;

/** Backup name before upgrading an old project file, <file>.bak-<schema version of the file>. */
export function createBackupPath(path: string, schemaVersion: number): string {
  return `${path}.bak-${schemaVersion}`;
}

/** The schema version in the name of a backup of this project file, null for any other file. */
function backupVersion(projectName: string, fileName: string): number | null {
  const prefix = `${projectName}.bak-`;
  if (!fileName.startsWith(prefix)) return null;
  const rest = fileName.slice(prefix.length);
  return /^\d+$/.test(rest) ? Number(rest) : null;
}

/** Deletes the oldest backups of a project file and returns the names that were removed. */
export function pruneBackups(path: string, keep: number = BACKUPS_KEPT): string[] {
  const dir = dirname(path);
  const name = basename(path);
  const found = readdirSync(dir)
    .map((file) => ({ file, version: backupVersion(name, file) }))
    .filter((entry): entry is { file: string; version: number } => entry.version !== null)
    .sort((a, b) => b.version - a.version);
  const removed = found.slice(keep).map((entry) => entry.file);
  for (const file of removed) rmSync(join(dir, file), { force: true });
  return removed;
}

/** Copies the project file next to itself before it is upgraded, then drops the oldest copies. */
export function backUpProject(path: string, schemaVersion: number): { backup: string; removed: string[] } {
  const backup = createBackupPath(path, schemaVersion);
  copyFileSync(path, backup);
  return { backup, removed: pruneBackups(path) };
}

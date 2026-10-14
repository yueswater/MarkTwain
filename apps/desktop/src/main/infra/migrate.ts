import { ErrorCode } from "../../shared/enums/error-code.enum";
import { AppError } from "../core/errors";
import type { Database } from "./db";

export type Migration = { version: number; name: string; sql: string };
export type MigrateResult = { from: number; to: number };

function assertSequential(migrations: Migration[]): void {
  migrations.forEach((migration, index) => {
    const expected = index + 1;
    if (migration.version !== expected) {
      throw new Error(
        `migration #${expected} must have version ${expected}, got ${migration.version} (${migration.name})`,
      );
    }
  });
}

export function currentVersion(db: Database): number {
  return db.get<{ user_version: number }>("PRAGMA user_version")?.user_version ?? 0;
}

/** 還沒套用的 migration 數量；資料庫比程式新時丟出 project.too-new。 */
export function pendingMigrations(db: Database, migrations: Migration[]): number {
  assertSequential(migrations);
  const from = currentVersion(db);
  if (from > migrations.length) {
    throw new AppError(ErrorCode.ProjectTooNew, { found: from, supported: migrations.length });
  }
  return migrations.length - from;
}

/**
 * 依序套用還沒套用的 migration。全部在單一交易內，失敗則整批回滾，
 * 版本號（`PRAGMA user_version`）也不變（規格 4.6 節）。
 */
export function migrate(db: Database, migrations: Migration[]): MigrateResult {
  const pending = pendingMigrations(db, migrations);
  const from = migrations.length - pending;
  if (pending === 0) return { from, to: from };

  db.transaction(() => {
    for (const migration of migrations.slice(from)) {
      db.exec(migration.sql);
      db.exec(`PRAGMA user_version = ${migration.version}`);
    }
  });
  return { from, to: migrations.length };
}

/** 資料庫裡沒有任何使用者建立的資料表（用來辨認「不是 MarkTwain 的檔案」）。 */
export function isEmptyDatabase(db: Database): boolean {
  return (
    db.get<{ n: number }>(
      "SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )?.n === 0
  );
}

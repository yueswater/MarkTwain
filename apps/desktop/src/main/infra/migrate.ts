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

/** Number of migrations not applied yet, throws project.too-new when the database is newer than the program. */
export function pendingMigrations(db: Database, migrations: Migration[]): number {
  assertSequential(migrations);
  const from = currentVersion(db);
  if (from > migrations.length) {
    throw new AppError(ErrorCode.ProjectTooNew, { found: from, supported: migrations.length });
  }
  return migrations.length - from;
}

/**
 * Applies pending migrations in order inside one transaction, the whole batch rolls back on failure
 * and the version in PRAGMA user_version stays unchanged.
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

/** The database has no user created tables, used to recognize files that are not MarkTwain projects. */
export function isEmptyDatabase(db: Database): boolean {
  return (
    db.get<{ n: number }>(
      "SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )?.n === 0
  );
}

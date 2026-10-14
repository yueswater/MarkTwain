import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { dirname } from "node:path";
import { ensureDir } from "../utils/fs.util";

/**
 * `node:sqlite` 的 API 仍標示為實驗性（規格第 3 節），所以整個專案只有這個檔案
 * 匯入它；其他程式碼只使用這裡的 `Database` 介面。
 */
export type SqlValue = string | number | bigint | null | Uint8Array;

export type RunResult = { changes: number; lastInsertRowid: number | bigint };

export interface Database {
  exec(sql: string): void;
  run(sql: string, params?: SqlValue[]): RunResult;
  get<T = Record<string, SqlValue>>(sql: string, params?: SqlValue[]): T | undefined;
  all<T = Record<string, SqlValue>>(sql: string, params?: SqlValue[]): T[];
  /** 在單一交易內執行；丟出例外時回滾並重新丟出。不允許巢狀。 */
  transaction<T>(fn: () => T): T;
  close(): void;
}

export function openDatabase(path: string): Database {
  if (path !== ":memory:") ensureDir(dirname(path));
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON");
  let inTransaction = false;
  let closed = false;

  return {
    exec: (sql) => db.exec(sql),

    run(sql, params = []) {
      const result = db.prepare(sql).run(...(params as SQLInputValue[]));
      return { changes: Number(result.changes), lastInsertRowid: result.lastInsertRowid };
    },

    get<T>(sql: string, params: SqlValue[] = []) {
      return db.prepare(sql).get(...(params as SQLInputValue[])) as T | undefined;
    },

    all<T>(sql: string, params: SqlValue[] = []) {
      return db.prepare(sql).all(...(params as SQLInputValue[])) as T[];
    },

    transaction<T>(fn: () => T): T {
      if (inTransaction) throw new Error("transaction() cannot be nested");
      db.exec("BEGIN");
      inTransaction = true;
      try {
        const result = fn();
        db.exec("COMMIT");
        return result;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      } finally {
        inTransaction = false;
      }
    },

    close() {
      if (closed) return;
      closed = true;
      db.close();
    },
  };
}

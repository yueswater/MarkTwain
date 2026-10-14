import { ErrorCode } from "../../shared/enums/error-code.enum";
import type { Database } from "../infra/db";
import { AppError } from "./errors";

/**
 * 目前開啟的資料庫連線與它的路徑。只保存狀態，不含任何領域知識，
 * 所以放在 core；feature 之間透過它共用「目前的專案」。
 */
export class DatabaseSession {
  private current: { db: Database; path: string } | null = null;

  /** 開啟新的連線；若已有開啟的，先關閉。 */
  open(db: Database, path: string): void {
    this.close();
    this.current = { db, path };
  }

  close(): void {
    this.current?.db.close();
    this.current = null;
  }

  get isOpen(): boolean {
    return this.current !== null;
  }

  get path(): string | null {
    return this.current?.path ?? null;
  }

  /** 沒有開啟的專案時丟出 project.none-open。 */
  get db(): Database {
    if (!this.current) throw new AppError(ErrorCode.ProjectNoneOpen);
    return this.current.db;
  }
}

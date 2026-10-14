import { ErrorCode } from "../../shared/enums/error-code.enum";
import type { Database } from "../infra/db";
import { AppError } from "./errors";

/**
 * The open database connection and its path. It only holds state and no domain knowledge,
 * so it lives in core and features share the current project through it.
 */
export class DatabaseSession {
  private current: { db: Database; path: string } | null = null;

  /** Opens a new connection and closes any open one first. */
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

  /** Throws project.none-open when no project is open. */
  get db(): Database {
    if (!this.current) throw new AppError(ErrorCode.ProjectNoneOpen);
    return this.current.db;
  }
}

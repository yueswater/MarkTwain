import { copyFileSync, existsSync, rmSync } from "node:fs";
import { ErrorCode } from "../../../shared/enums/error-code.enum";
import type { ProjectInfo } from "../../../shared/ipc";
import type { DatabaseSession } from "../../core/database-session";
import { AppError } from "../../core/errors";
import { createBackupPath } from "../../helpers/backup.helper";
import { openDatabase, type Database } from "../../infra/db";
import {
  currentVersion,
  isEmptyDatabase,
  migrate,
  pendingMigrations,
  type Migration,
} from "../../infra/migrate";
import { MIGRATIONS } from "../../infra/migrations";
import type { DocumentService } from "../document/document.service";
import { ProjectRepository } from "./project.repository";

export class ProjectService {
  constructor(
    private readonly session: DatabaseSession,
    private readonly documents: DocumentService,
    private readonly migrations: Migration[] = MIGRATIONS,
    private readonly now: () => Date = () => new Date(),
  ) {}

  create(path: string, name: string): ProjectInfo {
    if (existsSync(path)) throw new AppError(ErrorCode.ProjectExists);

    let db: Database | null = null;
    try {
      db = openDatabase(path);
      migrate(db, this.migrations);
      this.session.open(db, path);
      new ProjectRepository(db).insert(name, this.now().getTime());
      this.documents.seedDefaults();
      return this.info();
    } catch (error) {
      this.session.close();
      db?.close();
      rmSync(path, { force: true });
      throw error;
    }
  }

  open(path: string): ProjectInfo {
    if (!existsSync(path)) throw new AppError(ErrorCode.ProjectNotFound);

    const db = this.openChecked(path);
    try {
      const version = currentVersion(db);
      if (version === 0 && !isEmptyDatabase(db)) {
        throw new AppError(ErrorCode.ProjectInvalid);
      }
      const pending = pendingMigrations(db, this.migrations);
      if (pending > 0 && version > 0) {
        copyFileSync(path, createBackupPath(path, this.now()));
      }
      migrate(db, this.migrations);
      if (!new ProjectRepository(db).get()) throw new AppError(ErrorCode.ProjectInvalid);
    } catch (error) {
      db.close();
      throw error;
    }

    this.session.open(db, path);
    return this.info();
  }

  current(): ProjectInfo | null {
    return this.session.isOpen ? this.info() : null;
  }

  close(): void {
    this.session.close();
  }

  /** Opens the database and checks it really is a SQLite file. */
  private openChecked(path: string): Database {
    const db = openDatabase(path);
    try {
      db.get("PRAGMA user_version");
    } catch {
      db.close();
      throw new AppError(ErrorCode.ProjectInvalid);
    }
    return db;
  }

  private info(): ProjectInfo {
    const project = new ProjectRepository(this.session.db).get();
    if (!project) throw new AppError(ErrorCode.ProjectInvalid);
    return {
      name: project.name,
      path: this.session.path ?? "",
      documents: this.documents.list(),
    };
  }
}

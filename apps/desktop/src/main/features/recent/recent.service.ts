import { existsSync } from "node:fs";
import type { RecentProject } from "../../../shared/ipc";
import type { SettingsRepository } from "../settings/settings.repository";

const MAX_RECENT = 12;

/** The list of projects opened before and the one to reopen at startup. */
export class RecentService {
  constructor(
    private readonly repository: SettingsRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly exists: (path: string) => boolean = existsSync,
  ) {}

  list(): RecentProject[] {
    return this.repository
      .read()
      .recentProjects.map((entry) => ({ ...entry, exists: this.exists(entry.path) }));
  }

  /** Puts the project first in the list and marks it as the one to reopen. */
  record(path: string, name: string): void {
    const settings = this.repository.read();
    const others = settings.recentProjects.filter((entry) => entry.path !== path);
    this.repository.write({
      ...settings,
      recentProjects: [{ path, name, openedAt: this.now().getTime() }, ...others].slice(0, MAX_RECENT),
      lastProject: path,
    });
  }

  remove(path: string): RecentProject[] {
    const settings = this.repository.read();
    this.repository.write({
      ...settings,
      recentProjects: settings.recentProjects.filter((entry) => entry.path !== path),
      lastProject: settings.lastProject === path ? null : settings.lastProject,
    });
    return this.list();
  }

  /** The user closed the project on purpose, so do not reopen it at the next start. */
  clearLast(): void {
    const settings = this.repository.read();
    if (settings.lastProject !== null) this.repository.write({ ...settings, lastProject: null });
  }

  /** Path to reopen at startup, null when none or the file is gone. */
  lastPath(): string | null {
    const last = this.repository.read().lastProject;
    return last && this.exists(last) ? last : null;
  }
}

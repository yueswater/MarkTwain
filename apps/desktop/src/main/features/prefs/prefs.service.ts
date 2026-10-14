import type { EditorPrefs } from "../../../shared/ipc";
import { sanitizePrefs } from "../../../shared/prefs";
import type { SettingsRepository } from "../settings/settings.repository";

/** The editor preferences of the user, stored with the other app settings. */
export class PrefsService {
  constructor(private readonly repository: SettingsRepository) {}

  get(): EditorPrefs {
    return this.repository.read().editor;
  }

  set(patch: Partial<EditorPrefs>): EditorPrefs {
    const settings = this.repository.read();
    const editor = sanitizePrefs(patch, settings.editor);
    this.repository.write({ ...settings, editor });
    return editor;
  }
}

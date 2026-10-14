import type { AuthorProfile } from "../../../shared/profile";
import { sanitizeProfile } from "../../../shared/profile";
import type { SettingsRepository } from "../settings/settings.repository";

/** The facts of the author that every new project starts with, kept with the other app settings. */
export class ProfileService {
  constructor(private readonly repository: SettingsRepository) {}

  get(): AuthorProfile {
    return this.repository.read().profile;
  }

  set(patch: Partial<AuthorProfile>): AuthorProfile {
    const settings = this.repository.read();
    const profile = sanitizeProfile(patch, settings.profile);
    this.repository.write({ ...settings, profile });
    return profile;
  }
}

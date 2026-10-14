import { ErrorCode } from "../../../shared/enums/error-code.enum";
import type { Locale } from "../../../shared/enums/locale.enum";
import { isLocale } from "../../../shared/i18n/locale";
import type { LocaleView } from "../../../shared/ipc";
import { AppError } from "../../core/errors";
import { describeLocale } from "../../helpers/locale.helper";
import type { SettingsRepository } from "./settings.repository";

export class SettingsService {
  constructor(private readonly repository: SettingsRepository) {}

  getLocale(osLocale: string): LocaleView {
    return describeLocale(osLocale, this.repository.read().locale);
  }

  setLocale(setting: Locale | null, osLocale: string): LocaleView {
    if (setting !== null && !isLocale(setting)) {
      throw new AppError(ErrorCode.InvalidLocale, { value: String(setting) });
    }
    this.repository.write({ ...this.repository.read(), locale: setting });
    return describeLocale(osLocale, setting);
  }
}

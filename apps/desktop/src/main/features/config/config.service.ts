import {
  ConfigParseError,
  defaultFields,
  readConfig,
  validateConfig,
  writeConfig,
  type ConfigFields,
} from "@marktwain/schema";
import { ErrorCode } from "../../../shared/enums/error-code.enum";
import type { ConfigState } from "../../../shared/ipc";
import type { DatabaseSession } from "../../core/database-session";
import { AppError } from "../../core/errors";
import { ProjectRepository } from "../project/project.repository";
import { ConfigRepository } from "./config.repository";

/** 專案設定（config.yml）：表單欄位的讀寫與驗證；其他鍵與註解原樣保留。 */
export class ConfigService {
  constructor(
    private readonly session: DatabaseSession,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Raw config.yml text for the build, built from defaults when the project has none yet. */
  text(): string {
    const stored = new ConfigRepository(this.session.db).read();
    return stored ?? writeConfig("", this.initialFields());
  }

  get(): ConfigState {
    const text = new ConfigRepository(this.session.db).read();
    const fields = text === null ? this.initialFields() : this.parse(text);
    return { fields, issues: validateConfig(fields) };
  }

  set(fields: ConfigFields): ConfigState {
    const repository = new ConfigRepository(this.session.db);
    const existing = repository.read() ?? "";
    this.parse(existing); // 既有內容不是有效 YAML 時不要覆蓋
    repository.write(writeConfig(existing, fields), this.now().getTime());
    return { fields, issues: validateConfig(fields) };
  }

  /** 還沒有 config.yml 時，題目預設為專案名稱。 */
  private initialFields(): ConfigFields {
    const project = new ProjectRepository(this.session.db).get();
    return { ...defaultFields(), title: project?.name ?? "" };
  }

  private parse(text: string): ConfigFields {
    try {
      return readConfig(text);
    } catch (error) {
      if (error instanceof ConfigParseError) throw new AppError(ErrorCode.ConfigInvalid);
      throw error;
    }
  }
}

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

/** Project settings in config.yml, reads and validates the form fields and keeps other keys and comments. */
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
    this.parse(existing); // Do not overwrite content that is not valid YAML
    repository.write(writeConfig(existing, fields), this.now().getTime());
    return { fields, issues: validateConfig(fields) };
  }

  /** Without a config.yml the title defaults to the project name. */
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

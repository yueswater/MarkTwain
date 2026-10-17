import {
  ConfigParseError,
  defaultFields,
  inheritedValues,
  schoolTerms,
  readAdvanced,
  readConfig,
  validateConfig,
  writeAdvanced,
  writeConfig,
  type AdvancedValue,
  type ConfigFields,
} from "@marktwain/schema";
import { ErrorCode } from "../../../shared/enums/error-code.enum";
import type { AdvancedState, ConfigState } from "../../../shared/ipc";
import type { DatabaseSession } from "../../core/database-session";
import { AppError } from "../../core/errors";
import { ProjectRepository } from "../project/project.repository";
import { ConfigRepository } from "./config.repository";

/** Project settings in config.yml, reads and validates the form fields and keeps other keys and comments. */
export class ConfigService {
  constructor(
    private readonly session: DatabaseSession,
    private readonly now: () => Date = () => new Date(),
    /** Reads a file of the template such as schools/default.yml, null when it is missing */
    private readonly templateFile: (path: string) => string | null = () => null,
  ) {}

  /** Raw config.yml text for the build, built from defaults when the project has none yet. */
  text(): string {
    const stored = new ConfigRepository(this.session.db).read();
    return stored ?? writeConfig("", this.initialFields());
  }

  /** Advanced format settings: the overrides of the project and what they would be without them. */
  advanced(): AdvancedState {
    const text = new ConfigRepository(this.session.db).read() ?? "";
    this.parse(text);
    const school = readConfig(text).school;
    const defaults = this.templateFile("schools/default.yml") ?? "";
    const preset = school ? this.templateFile(`schools/${school}.yml`) : null;
    return { values: readAdvanced(text), inherited: inheritedValues(defaults, preset), terms: schoolTerms(defaults, preset) };
  }

  /** A path with a value is set, a path with null goes back to the inherited value. */
  setAdvanced(values: Record<string, AdvancedValue | null>): AdvancedState {
    const repository = new ConfigRepository(this.session.db);
    const existing = repository.read() ?? writeConfig("", this.initialFields());
    this.parse(existing);
    const patch = Object.fromEntries(Object.entries(values).map(([path, value]) => [path, value ?? undefined]));
    repository.write(writeAdvanced(existing, patch), this.now().getTime());
    return this.advanced();
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

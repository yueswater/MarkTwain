import { buildTable, loadLibrary, type Library, type Template } from "@marktwain/table-templates";
import { ErrorCode } from "../../../shared/enums/error-code.enum";
import type { TemplateField, TemplateLanguage, TemplateSummary } from "../../../shared/ipc";
import { AppError } from "../../core/errors";

function summaryOf(template: Template, language: TemplateLanguage): TemplateSummary {
  return {
    id: template.id,
    title: template.title[language],
    description: template.description[language],
    tags: template.tags,
    needs: template.needs,
    params: Object.fromEntries(Object.entries(template.params).map(([name, param]) => [name, { ...param, label: param.label[language] }])),
  };
}

/** The library of table templates, read from a folder of data files and kept. */
export class TableTemplateService {
  private library: Library | null = null;

  constructor(private readonly folder: () => string) {}

  private load(): Library {
    // A folder that cannot be read leaves the picker empty, the grid of the insert dialog still works
    this.library ??= (() => {
      try {
        return loadLibrary(this.folder());
      } catch {
        return { fields: [] };
      }
    })();
    return this.library;
  }

  list(language: TemplateLanguage): TemplateField[] {
    return this.load().fields.map((field) => ({ id: field.id, name: field.name[language], templates: field.templates.map((template) => summaryOf(template, language)) }));
  }

  build(id: string, language: TemplateLanguage, params: Record<string, number | boolean>): string {
    const template = this.load().fields.flatMap((field) => field.templates).find((t) => t.id === id);
    if (!template) throw new AppError(ErrorCode.TableTemplateUnknown);
    return buildTable(template, language, params);
  }
}

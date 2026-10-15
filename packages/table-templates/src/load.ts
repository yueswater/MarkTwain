import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { SHAPE_NAMES } from "./shapes";
import { validateField, validateTemplate, type Field, type Template } from "./schema";

export type Library = {
  fields: (Field & { templates: Template[] })[];
};

export class LibraryError extends Error {}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new LibraryError(`${path}: ${error instanceof Error ? error.message : "cannot be read"}`);
  }
}

/** Reads a folder with one folder for each field, field.json and one file for each template, and checks every file. */
export function loadLibrary(root: string): Library {
  const fields: Library["fields"] = [];
  for (const folder of readdirSync(root).sort()) {
    const dir = join(root, folder);
    if (!statSync(dir).isDirectory()) continue;
    const field = readJson(join(dir, "field.json"));
    const fieldProblems = validateField(field);
    if (fieldProblems.length > 0) throw new LibraryError(`${folder}/field.json: ${fieldProblems.join("; ")}`);
    const templates: Template[] = [];
    for (const file of readdirSync(dir).sort()) {
      if (file === "field.json" || !file.endsWith(".json")) continue;
      const template = readJson(join(dir, file)) as Template;
      const problems = validateTemplate(template, SHAPE_NAMES);
      if (problems.length > 0) throw new LibraryError(`${folder}/${file}: ${problems.join("; ")}`);
      if ((template as Template).field !== (field as Field).id) throw new LibraryError(`${folder}/${file}: field must be ${(field as Field).id}`);
      templates.push(template);
    }
    fields.push({ ...(field as Field), templates });
  }
  const ids = fields.flatMap((f) => f.templates.map((t) => t.id));
  const twice = ids.find((id, index) => ids.indexOf(id) !== index);
  if (twice) throw new LibraryError(`the template id ${twice} is used twice`);
  return { fields: fields.sort((a, b) => a.order - b.order) };
}

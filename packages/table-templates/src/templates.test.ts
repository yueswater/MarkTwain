import { describe, expect, it } from "@jest/globals";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { parseMarkdown, serializeMarkdown } from "@marktwain/schema";
import { buildTable } from "./build";
import { loadLibrary } from "./load";
import { LANGUAGES, resolveParams, validateField, validateTemplate, type Template } from "./schema";
import { SHAPE_NAMES } from "./shapes";

const root = resolve(__dirname, "../../../resources/table-templates");
const library = loadLibrary(root);
const templates = library.fields.flatMap((field) => field.templates);

/** The fields of the catalog of the issue, every one of them needs a folder. */
const CATALOG = ["common", "economics", "statistics", "engineering", "medicine", "social", "management"];

describe("the library", () => {
  it("has a folder for each field of the catalog, each with a template", () => {
    for (const id of CATALOG) {
      const field = library.fields.find((f) => f.id === id);
      expect(field?.templates.length ?? 0).toBeGreaterThan(0);
    }
    expect(readdirSync(root).filter((name) => !name.startsWith("."))).toEqual(expect.arrayContaining(CATALOG));
  });

  it("has valid fields and templates, with both languages", () => {
    for (const field of library.fields) expect(validateField(field)).toEqual([]);
    for (const template of templates) expect(validateTemplate(template, SHAPE_NAMES)).toEqual([]);
    expect(new Set(templates.map((t) => t.id)).size).toBe(templates.length);
  });

  it("uses a shape for each template, and every shape is used", () => {
    expect([...new Set(templates.map((t) => t.shape))].sort()).toEqual([...SHAPE_NAMES].sort());
  });
});

/** The values of the parameters at their limits, each alone and all together, and the defaults. */
function cases(template: Template): Record<string, number | boolean>[] {
  const out: Record<string, number | boolean>[] = [{}];
  const names = Object.keys(template.params);
  for (const name of names) {
    const param = template.params[name]!;
    if (param.type === "int") out.push({ [name]: param.min }, { [name]: param.max });
    else out.push({ [name]: !param.default });
  }
  out.push(Object.fromEntries(names.map((name) => [name, template.params[name]!.type === "int" ? (template.params[name] as { min: number }).min : false])));
  out.push(Object.fromEntries(names.map((name) => [name, template.params[name]!.type === "int" ? (template.params[name] as { max: number }).max : true])));
  return out;
}

describe.each(templates.map((t) => [t.id, t] as const))("template %s", (_id, template) => {
  it.each(LANGUAGES.map((l) => [l]))("builds a table that parses and writes back without change in %s", (language) => {
    for (const given of cases(template)) {
      const markdown = buildTable(template, language, given);
      const doc = parseMarkdown(markdown);
      const nodes = ((doc.content ?? []) as { type: string }[]).map((node) => node.type);
      expect(nodes).toEqual(["table"]);
      const once = serializeMarkdown(doc);
      expect(serializeMarkdown(parseMarkdown(once))).toBe(once);
    }
  });

  it("gives the table that the parameters say", () => {
    const params = resolveParams(template, {});
    const table = parseMarkdown(buildTable(template, "en")).content?.[0] as { content?: { content?: unknown[] }[]; attrs?: { caption?: string } };
    expect(table.content?.length).toBeGreaterThan(0);
    expect(table.attrs?.caption).toBeTruthy();
    expect(Object.keys(params)).toEqual(Object.keys(template.params));
  });

  it("keeps a number outside its limits inside them", () => {
    const given = Object.fromEntries(Object.keys(template.params).map((name) => [name, 10_000]));
    const resolved = resolveParams(template, given);
    for (const [name, param] of Object.entries(template.params)) {
      if (param.type === "int") expect(resolved[name]).toBe(param.max);
    }
  });
});

describe("shapes", () => {
  const find = (id: string) => templates.find((t) => t.id === id)!;

  it("the payoff matrix has its corner and the name of the column player merged", () => {
    const markdown = buildTable(find("payoff-matrix"), "en", { rows: 3, columns: 2 });
    expect(markdown).toContain('cells="1.1:colspan=2,rowspan=2;1.3:colspan=2;3.1:rowspan=3"');
    expect(markdown).toContain("style=grid");
    const table = parseMarkdown(markdown).content?.[0] as { attrs: { style: string }; content: { content: unknown[] }[] };
    expect(table.attrs.style).toBe("grid");
    expect(table.content).toHaveLength(5);
  });

  it("the regression has a row of standard errors below each variable and the lines of a table with models", () => {
    const markdown = buildTable(find("regression-multi-model"), "en", { models: 2, variables: 2 });
    expect(markdown.split("\n").filter((line) => line.includes("(0.000)"))).toHaveLength(2);
    expect(markdown).toContain("borders=");
    expect(markdown).toContain("Standard errors in brackets");
  });

  it("the correlation matrix has ones on the diagonal and nothing above it", () => {
    const rows = buildTable(find("correlation-matrix"), "en", { variables: 3 }).split("\n").filter((line) => line.startsWith("| (")).slice(-3);
    expect(rows[0]).toMatch(/\| 1 \|\s+\|\s+\|$/);
    expect(rows[2]).toMatch(/\| 0\.00 \| 0\.00 \| 1 \|$/);
  });

  it("the method comparison marks the best result in bold in its last row", () => {
    const markdown = buildTable(find("method-comparison"), "en", { methods: 3, metrics: 2 });
    expect(markdown).toContain("| Ours | **0.00** | **0.00** |");
  });
});

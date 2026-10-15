import { describe, expect, it } from "@jest/globals";
import { resolve } from "node:path";
import { AppError } from "../../core/errors";
import { TableTemplateService } from "./table-template.service";

const folder = resolve(__dirname, "../../../../../../resources/table-templates");

describe("TableTemplateService", () => {
  const service = new TableTemplateService(() => folder);

  it("lists the fields with the texts of the language that is asked for", () => {
    const english = service.list("en");
    expect(english.map((field) => field.id)).toContain("economics");
    expect(english.find((field) => field.id === "economics")?.name).toBe("Economics and finance");
    expect(service.list("zh-Hant").find((field) => field.id === "economics")?.name).toBe("經濟與財金");
    const payoff = english.flatMap((field) => field.templates).find((template) => template.id === "payoff-matrix");
    expect(payoff?.title).toBe("Payoff matrix");
    expect(payoff?.params.rows).toMatchObject({ type: "int", default: 2, min: 2, max: 6, label: "Strategies of the row player" });
  });

  it("builds a table from a template with its parameters", () => {
    const markdown = service.build("payoff-matrix", "en", { rows: 3, columns: 3 });
    expect(markdown).toContain("Player 2");
    expect(markdown.split("\n").filter((line) => line.startsWith("|")).length).toBe(2 + 4);
  });

  it("says when a template does not exist", () => {
    expect(() => service.build("nothing", "en", {})).toThrow(AppError);
  });

  it("is empty and does not fail when the folder cannot be read", () => {
    expect(new TableTemplateService(() => "/no/such/folder").list("en")).toEqual([]);
  });
});

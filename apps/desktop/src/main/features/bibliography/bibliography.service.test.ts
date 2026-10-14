import { beforeEach, describe, expect, it } from "@jest/globals";
import { DatabaseSession } from "../../core/database-session";
import { openDatabase } from "../../infra/db";
import { migrate } from "../../infra/migrate";
import { MIGRATIONS } from "../../infra/migrations";
import { AssetRepository } from "../asset/asset.repository";
import { DocumentService } from "../document/document.service";
import { BibliographyService } from "./bibliography.service";

let session: DatabaseSession;
let documents: DocumentService;
let bib: BibliographyService;

const entry = (key: string, extra: Record<string, string> = {}) => ({
  type: "article",
  key,
  fields: { author: "Wang, Xiaoming", title: "T", journal: "J", year: "2020", ...extra },
});

beforeEach(() => {
  const db = openDatabase(":memory:");
  migrate(db, MIGRATIONS);
  session = new DatabaseSession();
  session.open(db, ":memory:");
  let n = 0;
  documents = new DocumentService(session, () => `id-${++n}`, () => new Date(0));
  documents.seedDefaults();
  bib = new BibliographyService(session, documents, () => new Date(0));
});

describe("BibliographyService", () => {
  it("starts empty and adds, changes and removes entries", () => {
    expect(bib.view().items).toEqual([]);
    bib.upsert(entry("a"), null);
    const view = bib.upsert(entry("b", { title: "Other" }), null);
    expect(view.items.map((i) => i.key)).toEqual(["a", "b"]);
    expect(view.items[0]).toMatchObject({ label: "Wang, 2020", missing: [] });

    const changed = bib.upsert(entry("a2", { year: "2021" }), "a");
    expect(changed.items.map((i) => [i.key, i.fields.year])).toEqual([
      ["a2", "2021"],
      ["b", "2020"],
    ]);
    expect(bib.remove("b").items.map((i) => i.key)).toEqual(["a2"]);
  });

  it("rejects bad keys, duplicates and missing entries", () => {
    bib.upsert(entry("a"), null);
    expect(() => bib.upsert(entry("fig:x"), null)).toThrow();
    expect(() => bib.upsert(entry("has space"), null)).toThrow();
    expect(() => bib.upsert(entry("a"), null)).toThrow();
    expect(() => bib.upsert(entry("c"), "nope")).toThrow();
    expect(() => bib.remove("nope")).toThrow();
    expect(bib.upsert(entry("a", { title: "Same key kept" }), "a").items).toHaveLength(1);
  });

  it("keeps the order and comments of the source when one entry changes", () => {
    bib.setText("% mine\n@book{x, title = {X}}\n\n@book{y, title = {Y}}\n");
    const view = bib.upsert({ type: "book", key: "y", fields: { title: "Y2" } }, "y");
    expect(view.text.startsWith("% mine\n@book{x, title = {X}}\n\n@book{y,")).toBe(true);
    expect(view.items[1]!.fields.title).toBe("Y2");
  });

  it("reports where entries are cited and which cited keys are unknown", () => {
    bib.upsert(entry("a"), null);
    bib.upsert(entry("unused"), null);
    documents.save("id-1", "見 [@a]。\n");
    documents.save("id-2", "# 章\n\n[@a; @ghost] 與 @a。\n");
    const view = bib.view();
    expect(view.items.find((i) => i.key === "a")!.citedBy).toEqual([
      { documentId: "id-1", count: 1 },
      { documentId: "id-2", count: 2 },
    ]);
    expect(view.items.find((i) => i.key === "unused")!.citedBy).toEqual([]);
    expect(view.unknown).toEqual(["ghost"]);
  });

  it("flags duplicates, broken text and missing fields", () => {
    const view = bib.setText("@article{a, title={x}}\n@article{a, title={y}}\n@article{b,\n title={open");
    expect(view.duplicates).toEqual(["a"]);
    expect(view.errors).toHaveLength(1);
    expect(view.items[0]!.missing).toEqual(["author", "journal", "year"]);
  });

  it("imports BibTeX, CSL JSON and Hayagriva and skips keys that exist", () => {
    bib.upsert(entry("a"), null);
    const bibtex = bib.import("x.bib", "@book{a, title={dup}}\n@book{n1, title={New}}\n@book{fig:bad, title={bad}}");
    expect(bibtex).toMatchObject({ added: 1, skipped: ["a"], errors: ["fig:bad"] });

    // A BibTeX entry keeps the way it was written
    expect(bibtex.view.text).toContain("@book{n1, title={New}}");

    const csl = bib.import("x.json", JSON.stringify([{ id: "c1", type: "book", title: "C" }]));
    expect(csl.added).toBe(1);
    const yaml = bib.import("x.yml", "h1:\n  type: book\n  title: H\n");
    expect(yaml.view.items.map((i) => i.key)).toEqual(["a", "n1", "c1", "h1"]);
  });

  it("gives the build a file only when there is an entry", () => {
    expect(bib.buildFiles()).toEqual([]);
    bib.setText("just a comment");
    expect(bib.buildFiles()).toEqual([]);
    bib.upsert(entry("a"), null);
    const [file] = bib.buildFiles();
    expect(file!.path).toBe("references.bib");
    expect(Buffer.from(file!.data).toString("utf8")).toContain("@article{a,");
  });

  it("keeps the bibliography out of the image files of the build", () => {
    bib.upsert(entry("a"), null);
    new AssetRepository(session.db).put("images/x.png", new Uint8Array([1]), 0);
    expect(new AssetRepository(session.db).list().map((f) => f.path)).toEqual(["images/x.png"]);
  });
});

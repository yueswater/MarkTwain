import { beforeEach, describe, expect, it } from "@jest/globals";
import { DatabaseSession } from "../../core/database-session";
import { openDatabase } from "../../infra/db";
import { migrate } from "../../infra/migrate";
import { MIGRATIONS } from "../../infra/migrations";
import { DocumentService } from "../document/document.service";
import { LabelService } from "./label.service";

let documents: DocumentService;
let labels: LabelService;

beforeEach(() => {
  const db = openDatabase(":memory:");
  migrate(db, MIGRATIONS);
  const session = new DatabaseSession();
  session.open(db, ":memory:");
  let n = 0;
  documents = new DocumentService(session, () => `id-${++n}`, () => new Date(0));
  labels = new LabelService(documents);
});

describe("LabelService.resolve", () => {
  it("沒有文件內容時什麼都沒有", () => {
    documents.seedDefaults();
    const index = labels.resolve();
    expect(index).toMatchObject({ numbers: {}, broken: [], duplicates: [], targets: [], used: [] });
    expect(Object.values(index.bases).every((base) => Object.keys(base).length === 0)).toBe(true);
  });

  it("定理區塊每種類各自編號，後面的文件從前面的數量接續", () => {
    documents.seedDefaults(); // id-3 is chapter 1
    documents.save("id-3", "# 一\n\n::: {.lemma #lem:a}\nx\n:::\n\n::: {.lemma}\ny\n:::\n\n::: {.proof}\nz\n:::\n");
    const second = documents.create("chapter");
    documents.save(second.id, "# 二\n\n::: {.lemma #lem:c}\nx\n:::\n\n::: {.definition #def:d}\nx\n:::\n");

    const index = labels.resolve();
    expect(index.numbers).toMatchObject({ "lem:a": "1", "lem:c": "3", "def:d": "1" });
    expect(index.targets.map((t) => [t.label, t.kind])).toEqual(expect.arrayContaining([["lem:a", "lem"], ["def:d", "def"]]));
    expect(index.bases[second.id]).toEqual({ lem: 2 });
  });

  it("圖整篇連續編號，沒標籤的也佔編號；章標題顯示標題文字", () => {
    documents.seedDefaults(); // id-3 is chapter 1
    documents.save("id-3", "# 緒論 {#cha:intro}\n\n![一](a.png){#fig:a}\n\n![二](b.png)\n\n![三](c.png){#fig:c}\n");
    const second = documents.create("chapter");
    documents.save(second.id, "# 方法\n\n![四](d.png){#fig:d}\n");

    const index = labels.resolve();
    expect(index.numbers).toMatchObject({ "cha:intro": "緒論", "fig:a": "1", "fig:c": "3", "fig:d": "4" });
    expect(index.targets.map((t) => [t.label, t.display, t.kind])).toEqual([
      ["cha:intro", "緒論", "cha"],
      ["fig:a", "1", "fig"],
      ["fig:c", "3", "fig"],
      ["fig:d", "4", "fig"],
    ]);
    expect(index.targets.find((t) => t.label === "fig:d")?.documentId).toBe(second.id);
  });

  it("公式編號依專案設定決定要不要隨章節重新開始", () => {
    documents.seedDefaults();
    documents.save("id-3", "# 章\n\n$$\nx\n$$ {#eq:a}\n\n$$\ny\n$$ {#eq:b}\n");
    const perChapter = new LabelService(documents, () => ({ equationNumbering: "all", numberPerChapter: true }));
    const wholeThesis = new LabelService(documents, () => ({ equationNumbering: "all", numberPerChapter: false }));
    expect(perChapter.resolve().numbers["eq:b"]).toBe("1.2");
    expect(wholeThesis.resolve().numbers["eq:b"]).toBe("2");
  });

  it("取得標籤指向的內容，在哪份文件的哪一個區塊", () => {
    documents.seedDefaults();
    documents.save("id-3", "# 章\n\n![說明](a.png){#fig:a}\n\n文字。\n");
    const preview = labels.preview("fig:a");
    expect(preview).toMatchObject({ label: "fig:a", documentId: "id-3", block: 1, content: { type: "figure", src: "a.png", caption: "說明" } });
    expect(preview?.document.kind).toBe("chapter");
    expect(labels.preview("fig:none")).toBeNull();
  });

  it("找出失效的引用與重複的標籤", () => {
    documents.seedDefaults();
    documents.save("id-3", "![一](a.png){#fig:a}\n\n![二](b.png){#fig:a}\n\n見 @fig:a 與 @fig:gone。\n");
    const index = labels.resolve();
    expect(index.broken).toEqual(["fig:gone"]);
    expect(index.used).toContain("fig:gone");
    expect(index.duplicates).toEqual(["fig:a"]);
  });
});

describe("LabelService.references", () => {
  it("lists the blocks that refer to a label, document by document", () => {
    documents.seedDefaults(); // id-3 is chapter 1
    documents.save("id-3", "# 一\n\n$$\nx\n$$ {#eq:a}\n\n見 @eq:a 與 @eq:a。\n\n沒有引用。\n");
    const second = documents.create("chapter");
    documents.save(second.id, "# 二\n\n再次見 @eq:a。\n\n見 @eq:b。\n");

    const found = labels.references("eq:a");
    expect(found.map((r) => [r.documentId, r.block])).toEqual([["id-3", 2], [second.id, 1]]);
    expect(found[0]?.excerpt).toContain("見");
    expect(labels.references("eq:none")).toEqual([]);
  });
});

describe("LabelService.unlabeled and ensure", () => {
  const seed = () => {
    documents.seedDefaults();
    const [first, second] = documents.list().filter((d) => d.kind === "chapter");
    const chapter = first ?? documents.create("chapter" as never);
    const other = second ?? documents.create("chapter" as never);
    documents.save(chapter.id, "# 緒論\n\n## 動機\n");
    documents.save(other.id, "# 方法\n\n## 資料 {#sec:data}\n");
    return { chapter, other };
  };

  it("lists the unlabeled blocks of the other documents only", () => {
    const { chapter, other } = seed();
    const found = labels.unlabeled(chapter.id);
    expect(found.map((item) => [item.documentId, item.kind, item.text])).toEqual([[other.id, "cha", "方法"]]);
    expect(labels.unlabeled(null).map((item) => item.text)).toEqual(["緒論", "動機", "方法"]);
  });

  it("writes a label into the saved document, so that it can be referenced, and gives the same one again", () => {
    const { chapter, other } = seed();
    const block = labels.unlabeled(chapter.id)[0]!.block;
    const made = labels.ensure(other.id, block, "cha");
    expect(made?.label).toMatch(/^cha:[0-9a-f]{4}$/);
    expect(documents.get(other.id).text).toContain(`{#${made?.label}}`);
    expect(labels.resolve().targets.some((target) => target.label === made?.label)).toBe(true);
    expect(labels.ensure(other.id, block, "cha")).toEqual(made);
    expect(labels.unlabeled(chapter.id)).toEqual([]);
  });

  it("refuses a block that moved, is gone or is of another kind", () => {
    const { other } = seed();
    expect(labels.ensure(other.id, 0, "sec")).toBeNull();
    expect(labels.ensure(other.id, 99, "cha")).toBeNull();
  });
});

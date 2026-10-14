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
    expect(labels.resolve()).toEqual({ numbers: {}, broken: [], duplicates: [], targets: [], used: [] });
  });

  it("圖整篇連續編號，沒標籤的也佔編號；章標題顯示標題文字", () => {
    documents.seedDefaults(); // id-2 is chapter 1
    documents.save("id-2", "# 緒論 {#cha:intro}\n\n![一](a.png){#fig:a}\n\n![二](b.png)\n\n![三](c.png){#fig:c}\n");
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
    documents.save("id-2", "# 章\n\n$$\nx\n$$ {#eq:a}\n\n$$\ny\n$$ {#eq:b}\n");
    const perChapter = new LabelService(documents, () => ({ equationNumbering: "all", numberPerChapter: true }));
    const wholeThesis = new LabelService(documents, () => ({ equationNumbering: "all", numberPerChapter: false }));
    expect(perChapter.resolve().numbers["eq:b"]).toBe("1.2");
    expect(wholeThesis.resolve().numbers["eq:b"]).toBe("2");
  });

  it("取得標籤指向的內容，在哪份文件的哪一個區塊", () => {
    documents.seedDefaults();
    documents.save("id-2", "# 章\n\n![說明](a.png){#fig:a}\n\n文字。\n");
    const preview = labels.preview("fig:a");
    expect(preview).toMatchObject({ label: "fig:a", documentId: "id-2", block: 1, content: { type: "figure", src: "a.png", caption: "說明" } });
    expect(preview?.document.kind).toBe("chapter");
    expect(labels.preview("fig:none")).toBeNull();
  });

  it("找出失效的引用與重複的標籤", () => {
    documents.seedDefaults();
    documents.save("id-2", "![一](a.png){#fig:a}\n\n![二](b.png){#fig:a}\n\n見 @fig:a 與 @fig:gone。\n");
    const index = labels.resolve();
    expect(index.broken).toEqual(["fig:gone"]);
    expect(index.used).toContain("fig:gone");
    expect(index.duplicates).toEqual(["fig:a"]);
  });
});

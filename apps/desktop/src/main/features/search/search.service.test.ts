import { beforeEach, describe, expect, it } from "@jest/globals";
import { DatabaseSession } from "../../core/database-session";
import { openDatabase } from "../../infra/db";
import { migrate } from "../../infra/migrate";
import { MIGRATIONS } from "../../infra/migrations";
import { DocumentService } from "../document/document.service";
import { SearchService, blockText } from "./search.service";

let documents: DocumentService;
let search: SearchService;

beforeEach(() => {
  const db = openDatabase(":memory:");
  migrate(db, MIGRATIONS);
  const session = new DatabaseSession();
  session.open(db, ":memory:");
  let n = 0;
  documents = new DocumentService(session, () => `id-${++n}`, () => new Date(0));
  documents.seedDefaults();
  search = new SearchService(documents);
});

describe("SearchService", () => {
  it("finds text in every document with the block it is in and the words around it", () => {
    documents.save("id-1", "摘要裡提到 Gradient。\n");
    documents.save("id-2", "# 緒論\n\n第一段。\n\n梯度下降法用到 gradient 與 Gradient，很常見。\n");
    const { hits, truncated } = search.search("gradient", false);
    expect(truncated).toBe(false);
    expect(hits.map((h) => [h.documentId, h.block, h.match])).toEqual([
      ["id-1", 0, "Gradient"],
      ["id-2", 2, "gradient"],
      ["id-2", 2, "Gradient"],
    ]);
    expect(hits[1]).toMatchObject({ before: "梯度下降法用到 ", after: " 與 Gradient，很常見。" });
  });

  it("can match the case", () => {
    documents.save("id-2", "gradient Gradient\n");
    expect(search.search("Gradient", true).hits).toHaveLength(1);
  });

  it("looks into bold text, formulas, captions and footnotes, and not into Markdown marks", () => {
    documents.save("id-2", "這是**重點**與 $\\alpha$ 與腳註[^1]\n\n[^1]: 註解內容\n\n![圖說文字](images/a.png)\n");
    expect(search.search("重點", false).hits).toHaveLength(1);
    expect(search.search("alpha", false).hits).toHaveLength(1);
    expect(search.search("註解內容", false).hits).toHaveLength(1);
    expect(search.search("圖說文字", false).hits).toHaveLength(1);
    expect(search.search("**", false).hits).toHaveLength(0);
  });

  it("returns nothing for an empty query and marks a truncated result", () => {
    expect(search.search("   ", false)).toEqual({ hits: [], truncated: false });
    documents.save("id-2", "a ".repeat(400));
    const result = search.search("a", false);
    expect(result.hits).toHaveLength(300);
    expect(result.truncated).toBe(true);
  });

  it("blockText joins table cells and list items with spaces", () => {
    expect(blockText({ type: "tableRow", content: [{ type: "tableCell", content: [{ text: "甲" }] }, { type: "tableCell", content: [{ text: "乙" }] }] })).toBe("甲  乙");
  });
});

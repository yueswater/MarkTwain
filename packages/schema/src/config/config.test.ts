import { describe, expect, it } from "@jest/globals";
import { ConfigParseError, defaultFields, readConfig, validateConfig, writeConfig } from "./config";
import { SCHOOLS, isKnownSchool } from "./schools";

const TEMPLATE = `# 範本註解要保留
school: nccu
title: "研究題目"
id: 112345678 # 學號
keywords: ["中文", "論文"]
layout:
  caption-position:
    image: "top"
`;

describe("readConfig", () => {
  it("讀出欄位，數字型的學號保留成字串，沒有的欄位用預設值", () => {
    const fields = readConfig(TEMPLATE);
    expect(fields).toMatchObject({
      school: "nccu",
      title: "研究題目",
      id: "112345678",
      keywords: ["中文", "論文"],
      degree: "碩士",
      author: "",
    });
  });

  it("空檔案給預設值；YAML 語法錯誤丟出 ConfigParseError", () => {
    expect(readConfig("")).toEqual(defaultFields());
    expect(() => readConfig("title: [unclosed")).toThrow(ConfigParseError);
  });
});

describe("writeConfig", () => {
  it("只改表單管的鍵，其他鍵與註解原樣保留", () => {
    const fields = { ...readConfig(TEMPLATE), title: "新題目", author: "王小明" };
    const out = writeConfig(TEMPLATE, fields);
    expect(out).toContain("# 範本註解要保留");
    expect(out).toContain("# 學號");
    expect(out).toContain("caption-position:");
    expect(out).toContain('image: "top"');
    expect(readConfig(out)).toMatchObject({ title: "新題目", author: "王小明", school: "nccu" });
  });

  it("空字串與空陣列會刪掉該鍵，讓預設值生效", () => {
    const out = writeConfig(TEMPLATE, { ...readConfig(TEMPLATE), school: "", keywords: [] });
    expect(out).not.toContain("school:");
    expect(out).not.toContain("keywords:");
  });

  it("從空白開始寫，鍵用模板的 kebab-case，長文字不折行", () => {
    const fields = { ...defaultFields(), titleEn: "A very long English title ".repeat(8).trim(), oralDate: "2026-06-01" };
    const out = writeConfig("", fields);
    expect(out).toContain("title-en:");
    expect(out).toContain("oral-date: 2026-06-01");
    expect(out.split("\n").filter((line) => line.startsWith("title-en:"))).toHaveLength(1);
    expect(readConfig(out)).toEqual({ ...fields, titleEn: fields.titleEn });
  });

  it("特殊字元（冒號、井字號、引號）可以往返", () => {
    const fields = { ...defaultFields(), title: 'A: "B" # C', author: "- 王" };
    expect(readConfig(writeConfig("", fields))).toMatchObject({ title: 'A: "B" # C', author: "- 王" });
  });
});

describe("validateConfig", () => {
  it("題目與作者必填", () => {
    expect(validateConfig(defaultFields())).toEqual([
      { field: "title", code: "required" },
      { field: "author", code: "required" },
    ]);
  });

  it("日期必須是真實存在的 YYYY-MM-DD，可以留空", () => {
    const base = { ...defaultFields(), title: "t", author: "a" };
    expect(validateConfig({ ...base, date: "2026-02-30" })).toEqual([{ field: "date", code: "date-format" }]);
    expect(validateConfig({ ...base, oralDate: "2026/05/01" })).toEqual([{ field: "oralDate", code: "date-format" }]);
    expect(validateConfig({ ...base, date: "2024-02-29", oralDate: "" })).toEqual([]);
  });

  it("未知的學校代碼不通過", () => {
    const base = { ...defaultFields(), title: "t", author: "a" };
    expect(validateConfig({ ...base, school: "xyz" })).toEqual([{ field: "school", code: "unknown-school" }]);
    expect(validateConfig({ ...base, school: "ntu" })).toEqual([]);
  });
});

describe("SCHOOLS", () => {
  it("代碼不重複，isKnownSchool 認得全部", () => {
    expect(new Set(SCHOOLS.map((s) => s.code)).size).toBe(SCHOOLS.length);
    expect(SCHOOLS.every((s) => isKnownSchool(s.code))).toBe(true);
    expect(isKnownSchool("default")).toBe(false);
  });
});

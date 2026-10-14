import { beforeEach, describe, expect, it } from "@jest/globals";
import { defaultFields } from "@marktwain/schema";
import { DatabaseSession } from "../../core/database-session";
import { AppError } from "../../core/errors";
import { openDatabase, type Database } from "../../infra/db";
import { migrate } from "../../infra/migrate";
import { MIGRATIONS } from "../../infra/migrations";
import { ProjectRepository } from "../project/project.repository";
import { ConfigRepository } from "./config.repository";
import { ConfigService } from "./config.service";

let db: Database;
let service: ConfigService;

beforeEach(() => {
  db = openDatabase(":memory:");
  migrate(db, MIGRATIONS);
  new ProjectRepository(db).insert("我的論文", 0);
  const session = new DatabaseSession();
  session.open(db, ":memory:");
  service = new ConfigService(session, () => new Date(5));
});

describe("ConfigService", () => {
  it("還沒有設定時題目是專案名稱，並列出必填的缺漏", () => {
    const { fields, issues } = service.get();
    expect(fields).toEqual({ ...defaultFields(), title: "我的論文" });
    expect(issues).toEqual([{ field: "author", code: "required" }]);
  });

  it("儲存後讀得回來，檔案以 config.yml 存在 files 表", () => {
    const fields = { ...defaultFields(), title: "題目", author: "王小明", school: "ntu", keywords: ["甲", "乙"] };
    expect(service.set(fields).issues).toEqual([]);
    expect(service.get().fields).toEqual(fields);
    const text = new ConfigRepository(db).read() ?? "";
    expect(text).toContain("school: ntu");
    expect(text).toContain("author: 王小明");
  });

  it("不完整的表單也會存，回傳還缺什麼", () => {
    const result = service.set({ ...defaultFields(), title: "只有題目" });
    expect(result.issues).toEqual([{ field: "author", code: "required" }]);
    expect(service.get().fields.title).toBe("只有題目");
  });

  it("既有內容不是有效 YAML 時回報 config.invalid，不覆蓋", () => {
    new ConfigRepository(db).write("title: [oops", 0);
    const code = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return e instanceof AppError ? e.code : "other";
      }
    };
    expect(code(() => service.get())).toBe("config.invalid");
    expect(code(() => service.set(defaultFields()))).toBe("config.invalid");
    expect(new ConfigRepository(db).read()).toBe("title: [oops");
  });
});

describe("advanced settings", () => {
  const withTemplate = () => {
    const session = new DatabaseSession();
    const db2 = openDatabase(":memory:");
    migrate(db2, MIGRATIONS);
    new ProjectRepository(db2).insert("論文", 0);
    session.open(db2, ":memory:");
    const files: Record<string, string> = {
      "schools/default.yml": "layout:\n  font-size: 12\n  margin:\n    top: 3\n",
      "schools/ntu.yml": "layout:\n  margin:\n    top: 2\n",
    };
    return new ConfigService(session, () => new Date(1), (path) => files[path] ?? null);
  };

  it("shows overrides next to what the template and the school give", () => {
    const service = withTemplate();
    service.set({ ...defaultFields(), title: "t", school: "ntu" });
    expect(service.advanced()).toEqual({ values: {}, inherited: { "layout.font-size": 12, "layout.margin.top": 2, "placement.figure": "auto", "placement.table": "here" } });
  });

  it("sets overrides, removes them with null and keeps the basic fields", () => {
    const service = withTemplate();
    service.set({ ...defaultFields(), title: "題目", author: "王" });
    expect(service.setAdvanced({ "layout.font-size": 14, "page-number.align": "left" }).values).toEqual({ "layout.font-size": 14, "page-number.align": "left" });
    expect(service.setAdvanced({ "layout.font-size": null }).values).toEqual({ "page-number.align": "left" });
    expect(service.get().fields).toMatchObject({ title: "題目", author: "王" });
  });

  it("works on a project that has no config.yml yet", () => {
    const service = withTemplate();
    expect(service.setAdvanced({ "layout.justify": false }).values).toEqual({ "layout.justify": false });
    expect(service.get().fields.title).toBe("論文");
  });
});

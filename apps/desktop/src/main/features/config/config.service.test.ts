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

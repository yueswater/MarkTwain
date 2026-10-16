import { describe, expect, it } from "@jest/globals";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../../infra/db";
import { migrate } from "../../infra/migrate";
import { MIGRATIONS } from "../../infra/migrations";

// The acceptance of the storage: killing the app in the middle of a merge leaves the file as it was before the merge.
// A merge is one transaction (see VersionService), so this kills a process with such a transaction open, and reads the file again.
describe("a kill in the middle of a transaction of the versions", () => {
  it("leaves the project file as it was", () => {
    const dir = mkdtempSync(join(tmpdir(), "marktwain kill "));
    const file = join(dir, "專案.marktwain");
    try {
      const db = openDatabase(file);
      migrate(db, MIGRATIONS);
      db.run("INSERT INTO snapshots (id, parent_id, parent2_id, message, created_at) VALUES ('s1', NULL, NULL, '', 1)");
      db.run("INSERT INTO branches (name, head_id, base_id, created_at) VALUES ('main', 's1', 's1', 1)");
      db.close();

      const script = `
        const { DatabaseSync } = require("node:sqlite");
        const db = new DatabaseSync(process.argv[1]);
        db.exec("PRAGMA foreign_keys = ON");
        db.exec("BEGIN");
        db.exec("INSERT INTO snapshots (id, parent_id, parent2_id, message, created_at) VALUES ('s2', 's1', NULL, 'merge', 2)");
        db.exec("INSERT INTO blocks (hash, text) VALUES ('h', 'text')");
        db.exec("UPDATE branches SET head_id = 's2' WHERE name = 'main'");
        // The merge is half written: the new version and the move of the branch are in, the commit is not
        process.kill(process.pid, "SIGKILL");
      `;
      const child = spawnSync(process.execPath, ["-e", script, file], { encoding: "utf8" });
      expect(child.status === null || child.status !== 0).toBe(true);

      const after = openDatabase(file);
      expect(after.get<{ head_id: string }>("SELECT head_id FROM branches WHERE name = 'main'")?.head_id).toBe("s1");
      expect(after.get<{ n: number }>("SELECT COUNT(*) AS n FROM snapshots")?.n).toBe(1);
      expect(after.get<{ n: number }>("SELECT COUNT(*) AS n FROM blocks")?.n).toBe(0);
      expect(after.get<{ integrity_check: string }>("PRAGMA integrity_check")?.integrity_check).toBe("ok");
      after.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

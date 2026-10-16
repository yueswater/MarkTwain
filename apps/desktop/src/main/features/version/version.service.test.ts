import { beforeEach, describe, expect, it } from "@jest/globals";
import { DatabaseSession } from "../../core/database-session";
import { openDatabase } from "../../infra/db";
import { migrate } from "../../infra/migrate";
import { MIGRATIONS } from "../../infra/migrations";
import { AssetService } from "../asset/asset.service";
import { DocumentService } from "../document/document.service";
import { VersionService } from "./version.service";
import { projectWorkingCopy, type WorkingCopy } from "./working-copy";

let session: DatabaseSession;
let documents: DocumentService;
let assets: AssetService;
let versions: VersionService;
let wrap: (copy: WorkingCopy) => WorkingCopy;
let clock: number;
let ids: number;

function setup(started = true): void {
  const db = openDatabase(":memory:");
  migrate(db, MIGRATIONS);
  session = new DatabaseSession();
  session.open(db, ":memory:");
  clock = 1000;
  ids = 0;
  const now = () => new Date((clock += 1000));
  const newId = () => `id-${(ids += 1)}`;
  documents = new DocumentService(session, newId, now);
  assets = new AssetService(session, now);
  documents.seedDefaults();
  wrap = (copy) => copy;
  versions = new VersionService(session, { read: () => wrap(projectWorkingCopy(documents, assets)).read(), write: (content) => wrap(projectWorkingCopy(documents, assets)).write(content) }, newId, now);
  // The app asks for the status when a project is opened, which is when the first version is made
  if (started) versions.status();
}

const chapter = () => documents.list().find((d) => d.kind === "chapter")!;
const text = (id = chapter().id) => documents.get(id).text;
const write = (body: string, id = chapter().id) => documents.save(id, body);
const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return undefined;
};

beforeEach(() => setup());

describe("status and saving", () => {
  it("makes the main line from what the project holds the first time, and says nothing is changed", () => {
    const status = versions.status();
    expect(status).toMatchObject({ branch: "main", dirty: false });
    expect(status.branches.map((b) => b.name)).toEqual(["main"]);
    expect(versions.history()).toHaveLength(1);
  });

  it("sees a change as unsaved until a version is made, and refuses to make a version of nothing", () => {
    versions.status();
    write("# One\n\nHello\n");
    expect(versions.status().dirty).toBe(true);
    const saved = versions.save("first words");
    expect(saved.dirty).toBe(false);
    expect(versions.history().map((entry) => entry.message)).toEqual(["first words", ""]);
    expect(codeOf(() => versions.save("again"))).toBe("version.nothing-to-save");
  });

  it("sees a change to the title, the position, a new document and a file", () => {
    versions.status();
    documents.rename(chapter().id, "Intro");
    expect(versions.status().dirty).toBe(true);
    versions.save("title");
    documents.create("chapter" as never);
    expect(versions.status().dirty).toBe(true);
    versions.save("new chapter");
    assets.replaceAllFiles([{ path: "images/a.png", data: new Uint8Array([1, 2, 3]) }]);
    expect(versions.status().dirty).toBe(true);
  });
});

describe("branches", () => {
  it("needs a name that is not empty and not used", () => {
    versions.status();
    expect(codeOf(() => versions.startBranch("  "))).toBe("version.name-empty");
    versions.startBranch("rewrite");
    expect(codeOf(() => versions.startBranch("rewrite"))).toBe("version.name-taken");
    expect(codeOf(() => versions.startBranch("main"))).toBe("version.name-taken");
  });

  it("starts from the latest version, opens the new branch and keeps the main line as it was", () => {
    write("# One\n\nmain text\n");
    versions.save("main text");
    const main = versions.status().headId;
    versions.startBranch("rewrite");
    write("# One\n\nrewritten\n");
    versions.save("rewrite");
    const status = versions.status();
    expect(status.branch).toBe("rewrite");
    expect(status.branches.find((b) => b.name === "main")?.headId).toBe(main);
    expect(status.branches.find((b) => b.name === "rewrite")?.baseId).toBe(main);
  });

  it("takes the changes that were not saved along to the new branch", () => {
    versions.status();
    write("# One\n\nunsaved\n");
    expect(versions.startBranch("work")).toMatchObject({ branch: "work", dirty: true });
    expect(text()).toBe("# One\n\nunsaved\n");
  });

  it("puts the documents of a branch in place when it is opened, and keeps unsaved changes with the branch that they were made on", () => {
    write("# One\n\nmain\n");
    versions.save("main");
    versions.startBranch("work");
    write("# One\n\nwork\n");
    versions.save("work");
    write("# One\n\nwork, not saved\n");
    versions.switchBranch("main");
    expect(text()).toBe("# One\n\nmain\n");
    expect(versions.status().branches.find((b) => b.name === "work")?.hasDraft).toBe(true);
    versions.switchBranch("work");
    expect(text()).toBe("# One\n\nwork, not saved\n");
    expect(versions.status()).toMatchObject({ dirty: true });
    expect(versions.status().branches.find((b) => b.name === "work")?.hasDraft).toBe(false);
  });

  it("puts back the files and the documents that a branch added or took away", () => {
    versions.status();
    versions.startBranch("work");
    const extra = documents.create("chapter" as never);
    write("extra text\n", extra.id);
    assets.replaceAllFiles([{ path: "images/a.png", data: new Uint8Array([9]) }]);
    versions.save("extras");
    versions.switchBranch("main");
    expect(documents.list().some((d) => d.id === extra.id)).toBe(false);
    expect(assets.readAllFiles()).toEqual([]);
    versions.switchBranch("work");
    expect(documents.get(extra.id).text).toBe("extra text\n");
    expect(Array.from(assets.readAllFiles()[0]!.data)).toEqual([9]);
  });

  it("throws a branch away and goes back to the main line when it is the one that is open, and never throws the main line away", () => {
    write("# One\n\nmain\n");
    versions.save("main");
    versions.startBranch("bad idea");
    write("# One\n\nbad\n");
    versions.save("bad");
    expect(versions.discardBranch("bad idea").branch).toBe("main");
    expect(text()).toBe("# One\n\nmain\n");
    expect(versions.status().branches.map((b) => b.name)).toEqual(["main"]);
    expect(codeOf(() => versions.discardBranch("main"))).toBe("version.main-protected");
    expect(codeOf(() => versions.discardBranch("nope"))).toBe("version.branch-not-found");
  });
});

describe("history, restoring and comparing", () => {
  it("restores a version as a new version, so the history is only added to", () => {
    write("# One\n\nfirst\n");
    const first = versions.save("first").headId;
    write("# One\n\nsecond\n");
    versions.save("second");
    const status = versions.restore(first, "Restored first");
    expect(text()).toBe("# One\n\nfirst\n");
    expect(status.dirty).toBe(false);
    expect(versions.history().map((entry) => entry.message)).toEqual(["Restored first", "second", "first", ""]);
    expect(codeOf(() => versions.restore(first, "again"))).toBe("version.nothing-to-save");
    expect(codeOf(() => versions.restore("nope", "x"))).toBe("version.snapshot-not-found");
  });

  it("shows what changed between two versions with the text of the blocks, and collapses what stayed", () => {
    write("# One\n\nalpha\n\nbeta\n\ngamma\n");
    const before = versions.save("before").headId;
    write("# One\n\nalpha\n\nBETA\n\ngamma\n\ndelta\n");
    const after = versions.save("after").headId;
    const view = versions.compare(before, after);
    expect(view.documents).toHaveLength(1);
    expect(view.documents[0]?.changes).toEqual([
      { type: "same", count: 2 },
      { type: "modified", before: "beta", after: "BETA" },
      { type: "same", count: 1 },
      { type: "added", after: "delta" },
    ]);
  });
});

describe("merging into the main line", () => {
  const start = () => {
    write("# One\n\nalpha\n\nbeta\n\ngamma\n");
    versions.save("base");
    versions.startBranch("work");
  };

  it("only moves the main line when it has nothing that the branch lacks", () => {
    start();
    write("# One\n\nalpha\n\nbeta\n\ngamma\n\nmore\n");
    const head = versions.save("more").headId;
    expect(versions.previewMerge("work")).toEqual({ kind: "fast-forward" });
    const status = versions.merge("work", {}, false, "Merged");
    expect(status.branch).toBe("main");
    expect(status.branches.find((b) => b.name === "main")?.headId).toBe(head);
    expect(text()).toBe("# One\n\nalpha\n\nbeta\n\ngamma\n\nmore\n");
  });

  it("makes a version of two parents when both lines changed, keeping the changes of both", () => {
    start();
    write("# One\n\nALPHA\n\nbeta\n\ngamma\n");
    versions.save("work edit");
    versions.switchBranch("main");
    write("# One\n\nalpha\n\nbeta\n\nGAMMA\n");
    const mainHead = versions.save("main edit").headId;
    versions.switchBranch("work");
    expect(versions.previewMerge("work")).toEqual({ kind: "clean" });
    const status = versions.merge("work", {}, false, "Merged work");
    expect(text()).toBe("# One\n\nALPHA\n\nbeta\n\nGAMMA\n");
    const entry = versions.history()[0]!;
    expect(entry).toMatchObject({ message: "Merged work", parentId: mainHead });
    expect(entry.parent2Id).not.toBeNull();
    expect(status).toMatchObject({ branch: "main", dirty: false });
    expect(status.branches.map((b) => b.name)).toEqual(["main", "work"]);
  });

  it("can end the branch when it is merged", () => {
    start();
    write("# One\n\nALPHA\n\nbeta\n\ngamma\n");
    versions.save("work edit");
    versions.switchBranch("main");
    write("# One\n\nalpha\n\nbeta\n\nGAMMA\n");
    versions.save("main edit");
    expect(versions.merge("work", {}, true, "Merged").branches.map((b) => b.name)).toEqual(["main"]);
  });

  it("says nothing to merge when the main line has everything, and for the main line itself", () => {
    start();
    expect(versions.previewMerge("work")).toEqual({ kind: "up-to-date" });
    expect(codeOf(() => versions.merge("work", {}, false, "x"))).toBe("version.nothing-to-merge");
    expect(codeOf(() => versions.previewMerge("main"))).toBe("version.nothing-to-merge");
  });

  describe("with a conflict", () => {
    const conflict = () => {
      start();
      write("# One\n\nalpha\n\nWORK\n\ngamma\n");
      versions.save("work edit");
      versions.switchBranch("main");
      write("# One\n\nalpha\n\nMAIN\n\ngamma\n");
      versions.save("main edit");
      versions.switchBranch("work");
    };

    it("shows the text of both sides and the base, and writes nothing until every conflict has a choice", () => {
      conflict();
      const preview = versions.previewMerge("work");
      expect(preview).toMatchObject({ kind: "conflicts", conflicts: [{ type: "blocks", base: ["beta"], ours: ["MAIN"], theirs: ["WORK"] }] });
      const before = JSON.stringify(versions.status());
      expect(codeOf(() => versions.merge("work", {}, false, "x"))).toBe("version.conflicts");
      expect(JSON.stringify(versions.status())).toBe(before);
      expect(text()).toBe("# One\n\nalpha\n\nWORK\n\ngamma\n");
    });

    it("takes the main line, the change, both, or a text of its own", () => {
      conflict();
      const id = (versions.previewMerge("work") as { conflicts: { id: string }[] }).conflicts[0]!.id;
      const merged = (choice: Parameters<VersionService["merge"]>[1][string]) => {
        setup();
        conflict();
        versions.merge("work", { [id]: choice }, false, "x");
        return text();
      };
      expect(merged("ours")).toBe("# One\n\nalpha\n\nMAIN\n\ngamma\n");
      expect(merged("theirs")).toBe("# One\n\nalpha\n\nWORK\n\ngamma\n");
      expect(merged("both")).toBe("# One\n\nalpha\n\nMAIN\n\nWORK\n\ngamma\n");
      expect(merged({ text: "mine one\n\nmine two" })).toBe("# One\n\nalpha\n\nmine one\n\nmine two\n\ngamma\n");
    });

    it("needs the changes of the branch that is open to be saved, and the main line to have none waiting", () => {
      conflict();
      write("# One\n\nalpha\n\nWORK\n\ngamma\n\nunsaved\n");
      expect(codeOf(() => versions.merge("work", {}, false, "x"))).toBe("version.unsaved-changes");
      versions.save("saved");
      versions.switchBranch("main");
      write("# One\n\nunsaved on main\n");
      versions.switchBranch("work");
      expect(codeOf(() => versions.merge("work", {}, false, "x"))).toBe("version.main-has-draft");
    });

    it("leaves the project exactly as it was when the merge fails half way", () => {
      conflict();
      const id = (versions.previewMerge("work") as { conflicts: { id: string }[] }).conflicts[0]!.id;
      const before = { status: JSON.stringify(versions.status()), history: JSON.stringify(versions.history()), text: text(), snapshots: session.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM snapshots")!.n };
      // The documents are written, then the write of the files fails, as a kill between the two would
      wrap = (copy) => ({
        read: () => copy.read(),
        write: (content) => {
          copy.write({ documents: content.documents, files: [] });
          throw new Error("killed");
        },
      });
      expect(() => versions.merge("work", { [id]: "ours" }, true, "x")).toThrow("killed");
      wrap = (copy) => copy;
      expect(JSON.stringify(versions.status())).toBe(before.status);
      expect(JSON.stringify(versions.history())).toBe(before.history);
      expect(text()).toBe(before.text);
      expect(session.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM snapshots")!.n).toBe(before.snapshots);
    });
  });

  it("numbers the documents of a kind 1 to n again when both lines added one", () => {
    start();
    const mine = documents.create("chapter" as never);
    write("mine\n", mine.id);
    versions.save("mine");
    versions.switchBranch("main");
    const theirs = documents.create("chapter" as never);
    write("theirs\n", theirs.id);
    versions.save("theirs");
    versions.switchBranch("work");
    versions.merge("work", {}, false, "Merged");
    const positions = documents.list().filter((d) => d.kind === "chapter").map((d) => d.position);
    expect(positions).toEqual([1, 2, 3]);
  });
});

describe("a project from before the versions", () => {
  it("gets its first version from what it holds when the versions are first asked for", () => {
    setup(false);
    write("# One\n\nolder text\n");
    expect(session.db.get<{ n: number }>("SELECT COUNT(*) AS n FROM branches")!.n).toBe(0);
    expect(versions.status().dirty).toBe(false);
    versions.startBranch("work");
    versions.switchBranch("main");
    expect(text()).toBe("# One\n\nolder text\n");
  });
});

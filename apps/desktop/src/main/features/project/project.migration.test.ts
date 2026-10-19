import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSession } from "../../core/database-session";
import { AppError } from "../../core/errors";
import { openDatabase } from "../../infra/db";
import { currentVersion, type Migration } from "../../infra/migrate";
import { MIGRATIONS } from "../../infra/migrations";
import { AssetService } from "../asset/asset.service";
import { BibliographyService } from "../bibliography/bibliography.service";
import { DocumentService } from "../document/document.service";
import { VersionService } from "../version/version.service";
import { projectWorkingCopy } from "../version/working-copy";
import { ProjectService } from "./project.service";

/**
 * Projects that earlier versions made, kept as files in fixtures/ and named schema-<version>.marktwain.
 * Every later version of the program must open each of them with nothing lost. When a migration is added,
 * the fixture of the schema before it stays as it is, and a fixture for the new schema is written with
 * MARKTWAIN_WRITE_FIXTURE=1 pnpm --filter @marktwain/desktop test project.migration.
 */
const FIXTURES = join(__dirname, "fixtures");
const FIXTURE_PATTERN = /^schema-(\d+)\.marktwain$/;

/** What the fixtures hold, the tests look for it after an upgrade. */
const SAMPLE = {
  name: "Fixture thesis",
  chapter: "# 緒論\n\n這是固定的測試內容 $E = mc^2$，引用 [@lin2020]。\n\n![](images/IMAGE_PATH)\n",
  abstract: "摘要的固定內容",
  bibKey: "lin2020",
  versionMessage: "first saved version",
  branch: "experiment",
};

const PNG_1X1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

let dir: string;
let session: DatabaseSession;
let documents: DocumentService;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "marktwain-migration "));
  session = new DatabaseSession();
  documents = new DocumentService(session);
});

afterEach(() => {
  session.close();
  rmSync(dir, { recursive: true, force: true });
});

function service(migrations: Migration[] = MIGRATIONS): ProjectService {
  return new ProjectService(session, documents, migrations);
}

function fixtureFiles(): { file: string; schema: number }[] {
  mkdirSync(FIXTURES, { recursive: true });
  return readdirSync(FIXTURES).flatMap((file) => {
    const match = FIXTURE_PATTERN.exec(file);
    return match ? [{ file, schema: Number(match[1]) }] : [];
  });
}

function backups(): string[] {
  return readdirSync(dir).filter((name) => name.includes(".bak-")).sort();
}

/** Makes a project with every kind of content, so an upgrade has something of each to lose. */
function writeFixture(path: string): void {
  const projects = service();
  const info = projects.create(path, SAMPLE.name);
  const assets = new AssetService(session);
  // The first version is made from the empty project, so the content below is a change to save
  const versions = new VersionService(session, projectWorkingCopy(documents, assets));
  versions.status();
  const image = assets.storePng(PNG_1X1);
  const chapter = info.documents.find((d) => d.kind === "chapter")!;
  const abstract = info.documents.find((d) => d.kind === "abstract")!;
  documents.save(chapter.id, SAMPLE.chapter.replace("IMAGE_PATH", image.replace("images/", "")));
  documents.save(abstract.id, SAMPLE.abstract);
  new BibliographyService(session, documents).upsert(
    { type: "article", key: SAMPLE.bibKey, fields: { author: "Lin, Wei", title: "A fixed title", journal: "Journal", year: "2020" } },
    null,
  );
  versions.save(SAMPLE.versionMessage);
  versions.startBranch(SAMPLE.branch);
  versions.switchBranch("main");
  projects.close();
}

(process.env.MARKTWAIN_WRITE_FIXTURE === "1" ? it : it.skip)("writes the fixture of the current schema", () => {
  mkdirSync(FIXTURES, { recursive: true });
  const target = join(FIXTURES, `schema-${MIGRATIONS.length}.marktwain`);
  rmSync(target, { force: true });
  writeFixture(target);
  expect(currentVersion(openDatabase(target))).toBe(MIGRATIONS.length);
});

describe("the fixtures", () => {
  it("has a fixture of the schema that the first beta shipped", () => {
    expect(fixtureFiles().map((f) => f.schema)).toContain(3);
  });

  it("each fixture is the schema that its name says", () => {
    for (const { file, schema } of fixtureFiles()) {
      const db = openDatabase(join(FIXTURES, file));
      expect({ file, version: currentVersion(db) }).toEqual({ file, version: schema });
      db.close();
    }
  });
});

describe("opening the project of an earlier schema", () => {
  for (const { file, schema } of fixtureFiles()) {
    describe(file, () => {
      let path: string;

      beforeEach(() => {
        path = join(dir, "thesis.marktwain");
        copyFileSync(join(FIXTURES, file), path);
      });

      it("opens with the content as it was, and backs up first when the schema moved", () => {
        const before = readFileSync(path);
        const info = service().open(path);
        expect(info.name).toBe(SAMPLE.name);
        const chapter = info.documents.find((d) => d.kind === "chapter")!;
        expect(documents.get(chapter.id).text).toContain("這是固定的測試內容");
        expect(documents.get(info.documents.find((d) => d.kind === "abstract")!.id).text).toContain(SAMPLE.abstract);
        expect(new BibliographyService(session, documents).view().items.map((e) => e.key)).toEqual([SAMPLE.bibKey]);
        expect(new VersionService(session, projectWorkingCopy(documents, new AssetService(session))).history().map((h) => h.message)).toContain(SAMPLE.versionMessage);
        expect(currentVersion(session.db)).toBe(MIGRATIONS.length);

        if (schema < MIGRATIONS.length) {
          expect(backups()).toEqual([`thesis.marktwain.bak-${schema}`]);
          expect(readFileSync(`${path}.bak-${schema}`).equals(before)).toBe(true);
        } else {
          expect(backups()).toEqual([]);
        }
      });

      it("after a later migration, backs up the file as it was and keeps its content", () => {
        const later: Migration = { version: MIGRATIONS.length + 1, name: "later", sql: "CREATE TABLE later (id INTEGER)" };
        service([...MIGRATIONS, later]).open(path);
        expect(currentVersion(session.db)).toBe(later.version);
        expect(backups()).toContain(`thesis.marktwain.bak-${schema}`);
        const chapter = documents.list().find((d) => d.kind === "chapter")!;
        expect(documents.get(chapter.id).text).toContain("這是固定的測試內容");
      });
    });
  }
});

describe("backups of a project file", () => {
  function codeOf(fn: () => unknown): string | undefined {
    try {
      fn();
    } catch (error) {
      return error instanceof AppError ? error.code : "not-an-app-error";
    }
    return undefined;
  }

  it("keeps the last three, by schema version", () => {
    const path = join(dir, "thesis.marktwain");
    service().create(path, "x");
    session.close();
    // Walks the file through four bumps, the copy of each version is made before the bump
    let migrations = MIGRATIONS;
    for (let step = 1; step <= 4; step += 1) {
      migrations = [...migrations, { version: migrations.length + 1, name: `step${step}`, sql: `CREATE TABLE step${step} (id INTEGER)` }];
      service(migrations).open(path);
      session.close();
    }
    const first = MIGRATIONS.length;
    expect(backups()).toEqual([first + 1, first + 2, first + 3].map((v) => `thesis.marktwain.bak-${v}`));
  });

  it("does not upgrade a file when the copy cannot be made", () => {
    const path = join(dir, "thesis.marktwain");
    service().create(path, "x");
    session.close();
    // A folder with the name of the backup makes the copy fail
    mkdirSync(`${path}.bak-${MIGRATIONS.length}`);
    const later: Migration = { version: MIGRATIONS.length + 1, name: "later", sql: "CREATE TABLE later (id INTEGER)" };
    expect(codeOf(() => service([...MIGRATIONS, later]).open(path))).toBe("project.backup-failed");
    const check = openDatabase(path);
    expect(currentVersion(check)).toBe(MIGRATIONS.length);
    check.close();
  });

  it("makes no backup of a file that is not a project", () => {
    const path = join(dir, "plain.marktwain");
    writeFileSync(path, "not a database at all, just text that is long enough");
    expect(codeOf(() => service().open(path))).toBe("project.invalid");
    expect(backups()).toEqual([]);
  });
});

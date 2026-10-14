import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MARKER_FILE } from "./config";
import { buildCloneArgs, isUpToDate } from "./fetch";
import type { TemplateEntry, TemplateName } from "./types";

function readMarker(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function fetchTemplate(
  name: TemplateName,
  entry: TemplateEntry,
  templatesDir: string,
): "skipped" | "fetched" {
  const dest = join(templatesDir, name);
  const markerPath = join(dest, MARKER_FILE);
  if (existsSync(markerPath) && isUpToDate(readMarker(markerPath), entry)) {
    return "skipped";
  }

  const tmp = mkdtempSync(join(tmpdir(), `marktwain-${name}-`));
  try {
    const clone = join(tmp, "clone");
    execFileSync("gh", buildCloneArgs(entry, clone), { stdio: "inherit" });

    const head = execFileSync("git", ["-C", clone, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    if (head !== entry.commit) {
      throw new Error(
        `${name}: tag ${entry.tag} 目前指向 ${head}，與鎖定檔的 ${entry.commit} 不符`,
      );
    }

    rmSync(join(clone, ".git"), { recursive: true, force: true });
    writeFileSync(
      join(clone, MARKER_FILE),
      `${JSON.stringify({ tag: entry.tag, commit: entry.commit }, null, 2)}\n`,
    );

    rmSync(dest, { recursive: true, force: true });
    mkdirSync(templatesDir, { recursive: true });
    cpSync(clone, dest, { recursive: true });
    return "fetched";
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

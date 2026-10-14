import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { LOCK_FILE, OUTPUT_DIR, TEMPLATE_NAMES } from "./config";
import { parseLock } from "./lock";
import { fetchTemplate } from "./run";

// This file is in tools/fetch-templates/src/, three levels up is the repo root.
const root = fileURLToPath(new URL("../../../", import.meta.url));

try {
  const lock = parseLock(readFileSync(join(root, LOCK_FILE), "utf8"));
  const templatesDir = join(root, ...OUTPUT_DIR);

  // Optional arguments select templates, for example `pnpm templates:fetch typ`.
  const wanted = process.argv.slice(2);
  const names = wanted.length > 0 ? TEMPLATE_NAMES.filter((n) => wanted.includes(n)) : TEMPLATE_NAMES;
  for (const name of names) {
    const entry = lock.templates[name];
    const result = fetchTemplate(name, entry, templatesDir);
    console.log(`${name}: ${result}（${entry.repo}@${entry.tag}）`);
  }
} catch (error) {
  const err = error as NodeJS.ErrnoException;
  if (err.code === "ENOENT" && String(err.path ?? err.message).includes("gh")) {
    console.error("找不到 GitHub CLI（gh）。請安裝並執行 `gh auth login`。");
  } else {
    console.error(err.message);
  }
  process.exit(1);
}

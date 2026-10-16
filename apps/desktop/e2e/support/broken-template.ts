import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TEMPLATE_DIR } from "./paths";

function copyTree(source: string, destination: string): void {
  if (statSync(source).isDirectory()) {
    mkdirSync(destination, { recursive: true });
    for (const name of readdirSync(source)) copyTree(join(source, name), join(destination, name));
  } else {
    copyFileSync(source, destination);
  }
}

/**
 * A copy of the Typst template whose figure helper fails, in a folder of the test, so a build fails the way an error of the template would.
 * Nothing in a thesis makes a build fail any more that is not a fault of the template itself.
 */
export function brokenTemplate(parent: string): string {
  const dir = join(parent, "broken-template");
  mkdirSync(dir, { recursive: true });
  for (const name of readdirSync(TEMPLATE_DIR)) {
    const source = join(TEMPLATE_DIR, name);
    if (!statSync(source).isDirectory()) continue;
    if (name === "helper") copyTree(source, join(dir, name));
    else symlinkSync(source, join(dir, name), "junction");
  }
  const file = join(dir, "helper", "figure.typ");
  writeFileSync(file, readFileSync(file, "utf8").replace("#let as-image(src, width: 100%) = if type(src) == str {", '#let as-image(src, width: 100%) = if type(src) == str {\n  panic("test failure")'));
  return dir;
}

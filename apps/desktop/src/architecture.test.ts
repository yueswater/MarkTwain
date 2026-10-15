import { describe, expect, it } from "@jest/globals";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

const SRC = __dirname;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

const FILES = new Set(sourceFiles(SRC));

/** The files that a file imports with a relative path, the ones outside the source and the packages are not part of the graph. */
function importsOf(file: string): string[] {
  const found: string[] = [];
  for (const match of readFileSync(file, "utf8").matchAll(/from\s+["'](\.{1,2}\/[^"']*)["']/g)) {
    const base = normalize(join(dirname(file), match[1] as string));
    const target = [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")].find((path) => FILES.has(path));
    if (target) found.push(target);
  }
  return found;
}

describe("the structure of the app", () => {
  it("has no files that import each other in a circle", () => {
    const graph = new Map([...FILES].map((file) => [file, importsOf(file)]));
    const state = new Map<string, "open" | "done">();
    const circle: string[] = [];
    const visit = (file: string, path: string[]): void => {
      if (circle.length > 0 || state.get(file) === "done") return;
      if (state.get(file) === "open") {
        circle.push(...path.slice(path.indexOf(file)), file);
        return;
      }
      state.set(file, "open");
      for (const next of graph.get(file) ?? []) visit(next, [...path, file]);
      state.set(file, "done");
    };
    for (const file of graph.keys()) visit(file, []);
    expect(circle.map((file) => file.slice(SRC.length + 1))).toEqual([]);
  });

  it("keeps a feature of the back end from importing the routes of another feature", () => {
    // A feature takes what it needs from the service of another one, and the controller of a feature is only for the IPC
    const offenders = [...FILES]
      .filter((file) => file.includes("/main/features/"))
      .flatMap((file) => importsOf(file).filter((target) => target.endsWith(".controller.ts") && dirname(target) !== dirname(file)).map((target) => `${file.slice(SRC.length + 1)} -> ${target.slice(SRC.length + 1)}`));
    expect(offenders).toEqual([]);
  });
});

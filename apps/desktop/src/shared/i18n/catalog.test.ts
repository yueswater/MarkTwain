import { describe, expect, it } from "@jest/globals";
import { resources } from "./resources";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else Object.assign(out, flatten(value, path));
  }
  return out;
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1] ?? "").sort();
}

const zh = resources["zh-Hant"] as Record<string, Tree>;
const en = resources["en"] as Record<string, Tree>;

describe("message catalog", () => {
  it("兩個語言有相同的命名空間", () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
  });

  for (const ns of Object.keys(zh)) {
    const zhFlat = flatten(zh[ns] ?? {});
    const enFlat = flatten(en[ns] ?? {});

    it(`${ns}：兩個語言的鍵完全相同`, () => {
      expect(Object.keys(zhFlat).sort()).toEqual(Object.keys(enFlat).sort());
    });

    it(`${ns}：兩個語言的 {{佔位符}} 相同，且沒有空字串`, () => {
      for (const key of Object.keys(zhFlat)) {
        expect(zhFlat[key]).not.toBe("");
        expect(enFlat[key]).not.toBe("");
        expect(placeholders(zhFlat[key] ?? "")).toEqual(placeholders(enFlat[key] ?? ""));
      }
    });
  }
});

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

/** The Chinese name of a list at the front of the thesis follows the rules of the school, the English name does not, so only the Chinese text has this placeholder. */
const SCHOOL_TERMS = new Set(["toc"]);

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1] ?? "").filter((name) => !SCHOOL_TERMS.has(name)).sort();
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

    it(`${ns}：沒有引號，粗體與等寬字用成對的標記`, () => {
      for (const flat of [zhFlat, enFlat]) {
        for (const [key, text] of Object.entries(flat)) {
          expect({ key, quoted: /[「」『』“”]/.test(text) }).toEqual({ key, quoted: false });
          // What is left after the paired tags go must hold no tag, or one of them was left open
          expect({ key, open: /<\/?[bc]>/.test(text.replace(/<(b|c)>(.*?)<\/\1>/g, "$2")) }).toEqual({ key, open: false });
        }
      }
    });
  }
});

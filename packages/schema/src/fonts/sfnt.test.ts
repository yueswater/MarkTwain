import { describe, expect, it } from "@jest/globals";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FontFormatError, readFonts } from "./sfnt";

/** A font with only a name table and an OS/2 table, enough for the reader. */
function font(options: { family: string; style?: string; weight?: number; fsType?: number; italic?: boolean; chinese?: string }): Uint8Array {
  const names: { platform: number; language: number; id: number; text: string }[] = [
    { platform: 3, language: 0x409, id: 1, text: options.family },
    { platform: 3, language: 0x409, id: 2, text: options.style ?? "Regular" },
  ];
  if (options.chinese) names.push({ platform: 3, language: 0x404, id: 1, text: options.chinese });
  const strings = names.map((n) => {
    const out = new Uint8Array(n.text.length * 2);
    for (let i = 0; i < n.text.length; i += 1) new DataView(out.buffer).setUint16(i * 2, n.text.charCodeAt(i));
    return out;
  });
  const stringBytes = strings.reduce((sum, s) => sum + s.length, 0);
  const nameLength = 6 + names.length * 12 + stringBytes;
  const os2Length = 64;
  const headerLength = 12 + 2 * 16;
  const total = headerLength + nameLength + os2Length;
  const bytes = new Uint8Array(total);
  const v = new DataView(bytes.buffer);
  v.setUint32(0, 0x00010000);
  v.setUint16(4, 2);
  const put = (index: number, name: string, offset: number, length: number) => {
    for (let i = 0; i < 4; i += 1) v.setUint8(12 + index * 16 + i, name.charCodeAt(i));
    v.setUint32(12 + index * 16 + 8, offset);
    v.setUint32(12 + index * 16 + 12, length);
  };
  put(0, "OS/2", headerLength, os2Length);
  put(1, "name", headerLength + os2Length, nameLength);
  v.setUint16(headerLength + 4, options.weight ?? 400);
  v.setUint16(headerLength + 8, options.fsType ?? 0);
  v.setUint16(headerLength + 62, options.italic ? 1 : 0);
  const base = headerLength + os2Length;
  v.setUint16(base + 2, names.length);
  v.setUint16(base + 4, 6 + names.length * 12);
  let offset = 0;
  names.forEach((n, i) => {
    const at = base + 6 + i * 12;
    v.setUint16(at, n.platform);
    v.setUint16(at + 4, n.language);
    v.setUint16(at + 6, n.id);
    v.setUint16(at + 8, strings[i]!.length);
    v.setUint16(at + 10, offset);
    bytes.set(strings[i]!, base + 6 + names.length * 12 + offset);
    offset += strings[i]!.length;
  });
  return bytes;
}

describe("readFonts", () => {
  it("reads the family, style, weight and slant", () => {
    expect(readFonts(font({ family: "Example Sans", style: "Bold Italic", weight: 700, italic: true }))).toEqual([
      { family: "Example Sans", style: "Bold Italic", weight: 700, italic: true, aliases: [], embeddable: true },
    ]);
  });

  it("keeps the name in another language as an alias", () => {
    expect(readFonts(font({ family: "Example Kai", chinese: "範例楷書" }))[0]?.aliases).toEqual(["範例楷書"]);
  });

  it("says when the license does not allow embedding", () => {
    expect(readFonts(font({ family: "Locked", fsType: 2 }))[0]?.embeddable).toBe(false);
    expect(readFonts(font({ family: "Open", fsType: 8 }))[0]?.embeddable).toBe(true);
  });

  it("gives every font of a collection", () => {
    const a = font({ family: "One" });
    const b = font({ family: "Two" });
    const header = new Uint8Array(12 + 8);
    const v = new DataView(header.buffer);
    v.setUint32(0, 0x74746366);
    v.setUint32(8, 2);
    // The tables of each font hold offsets from the start of the file, so the fonts are shifted by rewriting their table offsets
    const shift = (bytes: Uint8Array, by: number) => {
      const copy = new Uint8Array(bytes);
      const view = new DataView(copy.buffer);
      for (let i = 0; i < 2; i += 1) view.setUint32(12 + i * 16 + 8, view.getUint32(12 + i * 16 + 8) + by);
      return copy;
    };
    v.setUint32(12, header.length);
    v.setUint32(16, header.length + a.length);
    const file = new Uint8Array(header.length + a.length + b.length);
    file.set(header, 0);
    file.set(shift(a, header.length), header.length);
    file.set(shift(b, header.length + a.length), header.length + a.length);
    expect(readFonts(file).map((face) => face.family)).toEqual(["One", "Two"]);
  });

  it("refuses what is not a font and what is cut off", () => {
    expect(() => readFonts(new TextEncoder().encode("not a font at all, just text"))).toThrow(FontFormatError);
    expect(() => readFonts(new Uint8Array(3))).toThrow(FontFormatError);
    expect(() => readFonts(font({ family: "x" }).slice(0, 40))).toThrow(FontFormatError);
    expect(() => readFonts(new Uint8Array([0x77, 0x4f, 0x46, 0x46, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toThrow(FontFormatError);
  });
});

describe("the fonts of the template", () => {
  const dir = resolve(__dirname, "../../../../resources/templates/typ/fonts");

  it("reads the names and styles of the shipped fonts", () => {
    if (!existsSync(dir)) return;
    const tinos = readFonts(readFileSync(resolve(dir, "english/Tinos/Tinos-BoldItalic.ttf")));
    expect(tinos[0]).toMatchObject({ family: "Tinos", weight: 700, italic: true, embeddable: true });
    const kai = readFonts(readFileSync(resolve(dir, "chinese/edukai-5.1.ttf")));
    expect(kai[0]?.family).toMatch(/Kai/i);
  });
});

/**
 * Reads the names and the style of the fonts in a font file without running any of it, only the tables of names and sizes are looked at.
 * A file with several fonts, a collection, gives one entry for each.
 */
export type FontFace = {
  /** The family that a font name in the settings refers to */
  family: string;
  /** Regular, Bold Italic and so on */
  style: string;
  /** 100 to 900 */
  weight: number;
  italic: boolean;
  /** Names of the family in other languages, so a search by a Chinese name finds it */
  aliases: string[];
  /** False when the license data of the font says it must not be embedded in a document */
  embeddable: boolean;
};

export class FontFormatError extends Error {}

const SIGNATURES = new Set([0x00010000, 0x4f54544f, 0x74727565]);
const COLLECTION = 0x74746366;

function view(data: Uint8Array): DataView {
  return new DataView(data.buffer, data.byteOffset, data.byteLength);
}

function fail(message: string): never {
  throw new FontFormatError(message);
}

function tag(data: DataView, offset: number): string {
  return String.fromCharCode(data.getUint8(offset), data.getUint8(offset + 1), data.getUint8(offset + 2), data.getUint8(offset + 3));
}

type Table = { offset: number; length: number };

function tablesOf(data: DataView, start: number): Map<string, Table> {
  if (start + 12 > data.byteLength) fail("the file is too short to be a font");
  const count = data.getUint16(start + 4);
  const tables = new Map<string, Table>();
  for (let i = 0; i < count; i += 1) {
    const at = start + 12 + i * 16;
    if (at + 16 > data.byteLength) fail("the table list is cut off");
    const offset = data.getUint32(at + 8);
    const length = data.getUint32(at + 12);
    if (offset + length > data.byteLength) fail("a table runs past the end of the file");
    tables.set(tag(data, at), { offset, length });
  }
  return tables;
}

type NameRecord = { id: number; language: number; text: string };

function decode(data: DataView, platform: number, offset: number, length: number): string | null {
  if (platform === 3 || platform === 0) {
    let out = "";
    for (let i = 0; i + 1 < length; i += 2) out += String.fromCharCode(data.getUint16(offset + i));
    return out;
  }
  if (platform === 1) {
    let out = "";
    for (let i = 0; i < length; i += 1) out += String.fromCharCode(data.getUint8(offset + i));
    return out;
  }
  return null;
}

function namesOf(data: DataView, table: Table): NameRecord[] {
  const count = data.getUint16(table.offset + 2);
  const strings = table.offset + data.getUint16(table.offset + 4);
  const records: NameRecord[] = [];
  for (let i = 0; i < count; i += 1) {
    const at = table.offset + 6 + i * 12;
    if (at + 12 > table.offset + table.length) break;
    const platform = data.getUint16(at);
    const language = data.getUint16(at + 4);
    const id = data.getUint16(at + 6);
    const length = data.getUint16(at + 8);
    const offset = strings + data.getUint16(at + 10);
    if (offset + length > data.byteLength) continue;
    const text = decode(data, platform, offset, length)?.trim();
    if (text) records.push({ id, language, text });
  }
  return records;
}

const ENGLISH = 0x0409;

function pick(records: NameRecord[], ids: number[]): string | null {
  for (const id of ids) {
    const found = records.filter((record) => record.id === id);
    const english = found.find((record) => record.language === ENGLISH || record.language === 0);
    if (english ?? found[0]) return (english ?? (found[0] as NameRecord)).text;
  }
  return null;
}

function faceAt(data: DataView, start: number): FontFace {
  const tables = tablesOf(data, start);
  const nameTable = tables.get("name");
  if (!nameTable) fail("the font has no name table");
  const records = namesOf(data, nameTable);
  const family = pick(records, [16, 1]);
  if (!family) fail("the font has no family name");
  const style = pick(records, [17, 2]) ?? "Regular";

  let weight = 400;
  let italic = /italic|oblique/i.test(style);
  let embeddable = true;
  const os2 = tables.get("OS/2");
  if (os2 && os2.length >= 8) {
    weight = data.getUint16(os2.offset + 4);
    // The restricted license bit forbids putting the font in a document
    embeddable = (data.getUint16(os2.offset + 8) & 0x0002) === 0;
    if (os2.length >= 64) italic = italic || (data.getUint16(os2.offset + 62) & 0x0001) !== 0;
  } else if (/bold/i.test(style)) {
    weight = 700;
  }
  if (!(weight >= 1 && weight <= 1000)) weight = 400;

  const aliases = [...new Set(records.filter((record) => (record.id === 16 || record.id === 1) && record.text !== family).map((record) => record.text))];
  return { family, style, weight, italic, aliases, embeddable };
}

/** The fonts of a file, a file that is not a font gives an error that says why. */
export function readFonts(bytes: Uint8Array): FontFace[] {
  const data = view(bytes);
  if (data.byteLength < 12) fail("the file is too short to be a font");
  const signature = data.getUint32(0);
  if (signature === COLLECTION) {
    const count = data.getUint32(8);
    if (count < 1 || count > 64) fail("the collection has an odd number of fonts");
    return Array.from({ length: count }, (_, i) => faceAt(data, data.getUint32(12 + i * 4)));
  }
  if (!SIGNATURES.has(signature)) fail("the file is not a TrueType or OpenType font");
  return [faceAt(data, 0)];
}

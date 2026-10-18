import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

type Entry = { name: string; method: number; size: number; offset: number };

/** The entries of a zip, read from its central directory, so no zip tool is needed. */
function readEntries(bytes: Buffer): Entry[] {
  // The end record is the last 22 bytes when the zip has no comment
  let end = bytes.length - 22;
  while (end >= 0 && bytes.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error("not a zip");
  const count = bytes.readUInt16LE(end + 10);
  let at = bytes.readUInt32LE(end + 16);
  const entries: Entry[] = [];
  for (let i = 0; i < count; i++) {
    const nameLength = bytes.readUInt16LE(at + 28);
    const extraLength = bytes.readUInt16LE(at + 30);
    const commentLength = bytes.readUInt16LE(at + 32);
    entries.push({
      name: bytes.subarray(at + 46, at + 46 + nameLength).toString("utf8"),
      method: bytes.readUInt16LE(at + 10),
      size: bytes.readUInt32LE(at + 20),
      offset: bytes.readUInt32LE(at + 42),
    });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/** The names of the files in a zip. */
export function zipEntries(path: string): string[] {
  return readEntries(readFileSync(path)).map((entry) => entry.name);
}

/** The text of one file in a zip. */
export function zipText(path: string, name: string): string {
  const bytes = readFileSync(path);
  const entry = readEntries(bytes).find((candidate) => candidate.name === name);
  if (!entry) throw new Error(`${name} is not in the zip`);
  const start = entry.offset + 30 + bytes.readUInt16LE(entry.offset + 26) + bytes.readUInt16LE(entry.offset + 28);
  const data = bytes.subarray(start, start + entry.size);
  return (entry.method === 8 ? inflateRawSync(data) : data).toString("utf8");
}

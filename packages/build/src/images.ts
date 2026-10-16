import { deflateSync } from "node:zlib";
import type { Block, IrDocument } from "@marktwain/render";
import type { BuildFile } from "./types";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** A PNG whose chunks run in order from the header to the end chunk, a file cut short or filled with something else is not one that can be decoded. */
function isCompletePng(bytes: Buffer): boolean {
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return false;
  let at = 8;
  let first = true;
  while (at + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(at);
    const type = bytes.subarray(at + 4, at + 8).toString("latin1");
    if (first && type !== "IHDR") return false;
    first = false;
    const end = at + 12 + length;
    if (end > bytes.length) return false;
    if (type === "IEND") return true;
    at = end;
  }
  return false;
}

/** Whether the bytes are an image of the kind that the name says, by the signature of the file. A text file named a.png is not. */
export function looksLikeImage(path: string, data: Uint8Array): boolean {
  const bytes = Buffer.from(data);
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  if (ext === "png") return isCompletePng(bytes);
  if (ext === "jpg" || ext === "jpeg") return bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && (() => { const end = bytes.lastIndexOf(Buffer.from([0xff, 0xd9])); return end >= 0 && end > bytes.length - 64; })();
  if (ext === "svg") return /<svg[\s>]/i.test(bytes.subarray(0, 4096).toString("utf8"));
  if (ext === "pdf") return bytes.subarray(0, 5).toString("latin1") === "%PDF-";
  return bytes.length > 0;
}

const TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Buffer): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = (TABLE[(c ^ byte) & 0xff] as number) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "latin1");
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, tail]);
}

let cached: Uint8Array | null = null;

/** A light grey box with a darker frame, 4 to 3, which stands where an image is missing so the caption, the number and the label of the figure stay. */
export function placeholderPng(): Uint8Array {
  if (cached) return cached;
  const width = 320;
  const height = 240;
  const rows: Buffer[] = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width, 230);
    row[0] = 0;
    const edge = y < 2 || y >= height - 2;
    for (let x = 0; x < width; x += 1) if (edge || x < 2 || x >= width - 2) row[1 + x] = 170;
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 0; // grey
  cached = new Uint8Array(Buffer.concat([PNG_SIGNATURE, chunk("IHDR", header), chunk("IDAT", deflateSync(Buffer.concat(rows))), chunk("IEND", Buffer.alloc(0))]));
  return cached;
}

function usesImage(block: Block, src: string): boolean {
  switch (block.type) {
    case "figure":
      return block.src === src;
    case "figureGroup":
      return block.items.some((item) => item.src === src);
    case "list":
      return block.items.some((item) => item.some((child) => usesImage(child, src)));
    case "quote":
    case "div":
      return block.children.some((child) => usesImage(child, src));
    case "definitionList":
      return block.entries.some((entry) => entry.descriptions.some((d) => d.some((child) => usesImage(child, src))));
    default:
      return false;
  }
}

/** Every image path that a document asks for. */
function collectImages(blocks: readonly Block[], found: Set<string>): void {
  for (const block of blocks) {
    switch (block.type) {
      case "figure":
        found.add(block.src);
        break;
      case "figureGroup":
        for (const item of block.items) found.add(item.src);
        break;
      case "list":
        for (const item of block.items) collectImages(item, found);
        break;
      case "quote":
      case "div":
        collectImages(block.children, found);
        break;
      case "definitionList":
        for (const entry of block.entries) for (const d of entry.descriptions) collectImages(d, found);
        break;
      default:
        break;
    }
  }
}

export type ImageIssue = { src: string; reason: "missing" | "unreadable"; documentId: string; block: number };

/** Where the grey box is written in the figures folder, a png whatever the name of the image that it stands for. */
export const PLACEHOLDER_PATH = "marktwain-missing.png";

/**
 * Looks at every image that a document asks for. One that is not in the project, or is not an image, is shown as the grey box,
 * so a single bad picture does not fail the whole PDF, and the issue says which block holds it.
 * The result maps the path of such an image to the path of the box.
 */
export function checkImages(input: {
  documents: { id: string; document: IrDocument }[];
  files: readonly BuildFile[];
  write: (src: string, data: Uint8Array) => void;
}): { issues: ImageIssue[]; replace: Map<string, string> } {
  const byPath = new Map(input.files.map((file) => [file.path, file.data]));
  const issues: ImageIssue[] = [];
  const replace = new Map<string, string>();
  const referenced = new Set<string>();
  for (const { document } of input.documents) collectImages(document.blocks, referenced);
  for (const src of referenced) {
    const data = byPath.get(src);
    const reason = data === undefined ? "missing" : looksLikeImage(src, data) ? null : "unreadable";
    if (!reason) continue;
    replace.set(src, PLACEHOLDER_PATH);
    for (const { id, document } of input.documents) {
      document.blocks.forEach((block, index) => {
        if (usesImage(block, src)) issues.push({ src, reason, documentId: id, block: index });
      });
    }
  }
  if (replace.size > 0) input.write(PLACEHOLDER_PATH, placeholderPng());
  return { issues, replace };
}

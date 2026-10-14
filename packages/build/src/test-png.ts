import { inflateSync } from "node:zlib";

export type Gray = { width: number; height: number; data: Uint8Array };

/** Reads an 8 bit PNG without interlacing into gray levels, enough to look at the pages that Typst draws. */
export function decodeGray(png: Uint8Array): Gray {
  const buffer = Buffer.from(png);
  let width = 0;
  let height = 0;
  let channels = 0;
  const chunks: Buffer[] = [];
  for (let at = 8; at < buffer.length; ) {
    const length = buffer.readUInt32BE(at);
    const type = buffer.toString("ascii", at + 4, at + 8);
    const body = buffer.subarray(at + 8, at + 8 + length);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const colorType = body[9];
      channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 4 ? 2 : 4;
      if (body[8] !== 8 || body[12] !== 0) throw new Error("only 8 bit PNG without interlacing");
    } else if (type === "IDAT") chunks.push(body);
    at += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  const rows: Uint8Array[] = [];
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)] ?? 0;
    const line = Uint8Array.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    const up = rows[y - 1] ?? new Uint8Array(stride);
    for (let i = 0; i < stride; i += 1) {
      const left = i >= channels ? (line[i - channels] ?? 0) : 0;
      const upLeft = i >= channels ? (up[i - channels] ?? 0) : 0;
      const value = line[i] ?? 0;
      if (filter === 1) line[i] = (value + left) & 255;
      else if (filter === 2) line[i] = (value + (up[i] ?? 0)) & 255;
      else if (filter === 3) line[i] = (value + ((left + (up[i] ?? 0)) >> 1)) & 255;
      else if (filter === 4) {
        const upper = up[i] ?? 0;
        const p = left + upper - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - upper);
        const pc = Math.abs(p - upLeft);
        line[i] = (value + (pa <= pb && pa <= pc ? left : pb <= pc ? upper : upLeft)) & 255;
      }
    }
    rows.push(line);
  }
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) data[y * width + x] = rows[y]?.[x * channels] ?? 255;
  }
  return { width, height, data };
}

/** Horizontal positions of long vertical dark lines, a line a few pixels thick is one position. */
export function verticalLines(image: Gray, minimumRun: number): number[] {
  const hits: number[] = [];
  for (let x = 0; x < image.width; x += 1) {
    let run = 0;
    let best = 0;
    for (let y = 0; y < image.height; y += 1) {
      run = (image.data[y * image.width + x] ?? 255) < 215 ? run + 1 : 0;
      best = Math.max(best, run);
    }
    if (best >= minimumRun) hits.push(x);
  }
  const centers: number[] = [];
  let group: number[] = [];
  for (const x of hits) {
    if (group.length > 0 && x - (group.at(-1) as number) > 2) {
      centers.push(group.reduce((a, b) => a + b, 0) / group.length);
      group = [];
    }
    group.push(x);
  }
  if (group.length > 0) centers.push(group.reduce((a, b) => a + b, 0) / group.length);
  return centers;
}

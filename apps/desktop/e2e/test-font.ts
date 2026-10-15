/** A font with a name table and an OS/2 table, enough for MarkTwain to read its name, so a test can add a font without shipping one. */
export function makeFont(family: string, options: { style?: string; fsType?: number } = {}): Buffer {
  const names = [
    { id: 1, text: family },
    { id: 2, text: options.style ?? "Regular" },
  ];
  const strings = names.map((n) => {
    const out = Buffer.alloc(n.text.length * 2);
    for (let i = 0; i < n.text.length; i += 1) out.writeUInt16BE(n.text.charCodeAt(i), i * 2);
    return out;
  });
  const nameLength = 6 + names.length * 12 + strings.reduce((sum, s) => sum + s.length, 0);
  const headerLength = 12 + 2 * 16;
  const bytes = Buffer.alloc(headerLength + nameLength + 64);
  bytes.writeUInt32BE(0x00010000, 0);
  bytes.writeUInt16BE(2, 4);
  const put = (index: number, tag: string, offset: number, length: number) => {
    bytes.write(tag, 12 + index * 16, "ascii");
    bytes.writeUInt32BE(offset, 12 + index * 16 + 8);
    bytes.writeUInt32BE(length, 12 + index * 16 + 12);
  };
  put(0, "OS/2", headerLength, 64);
  put(1, "name", headerLength + 64, nameLength);
  bytes.writeUInt16BE(400, headerLength + 4);
  bytes.writeUInt16BE(options.fsType ?? 0, headerLength + 8);
  const base = headerLength + 64;
  bytes.writeUInt16BE(names.length, base + 2);
  bytes.writeUInt16BE(6 + names.length * 12, base + 4);
  let offset = 0;
  names.forEach((n, i) => {
    const at = base + 6 + i * 12;
    bytes.writeUInt16BE(3, at);
    bytes.writeUInt16BE(0x409, at + 4);
    bytes.writeUInt16BE(n.id, at + 6);
    bytes.writeUInt16BE(strings[i]!.length, at + 8);
    bytes.writeUInt16BE(offset, at + 10);
    strings[i]!.copy(bytes, base + 6 + names.length * 12 + offset);
    offset += strings[i]!.length;
  });
  return bytes;
}

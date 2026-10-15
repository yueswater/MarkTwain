export type JsonNode = { text?: string; attrs?: Record<string, unknown>; content?: JsonNode[]; type?: string };

/** The text a reader sees in a block: words, formula source and the text of captions, notes and footnotes. */
export function blockText(node: JsonNode): string {
  if (node.text !== undefined) return node.text;
  const own: string[] = [];
  if (node.type === "inlineMath" || node.type === "blockMath") own.push(String(node.attrs?.latex ?? ""));
  if (node.type === "footnote") own.push(String(node.attrs?.text ?? ""));
  if (node.type === "figure" || node.type === "table" || node.type === "figureGroup") own.push(String(node.attrs?.caption ?? ""));
  const children = (node.content ?? []).map(blockText);
  // Paragraphs of a list item or cells of a row are separated so words do not run together
  return [...own, ...children].filter((part) => part !== "").join(node.type === "tableRow" ? "  " : " ");
}

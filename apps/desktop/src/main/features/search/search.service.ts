import { parseMarkdown } from "@marktwain/schema";
import type { SearchHit } from "../../../shared/ipc";
import type { DocumentService } from "../document/document.service";

const MAX_HITS = 300;
const CONTEXT = 36;

type JsonNode = { text?: string; attrs?: Record<string, unknown>; content?: JsonNode[]; type?: string };

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

/** Finds text in every document of the project. */
export class SearchService {
  constructor(private readonly documents: DocumentService) {}

  search(text: string, caseSensitive: boolean): { hits: SearchHit[]; truncated: boolean } {
    const query = text.trim();
    if (query === "") return { hits: [], truncated: false };
    const needle = caseSensitive ? query : query.toLowerCase();
    const hits: SearchHit[] = [];

    for (const summary of this.documents.list()) {
      const doc = this.documents.get(summary.id);
      const blocks = (parseMarkdown(doc.text).content as JsonNode[]) ?? [];
      for (const [block, node] of blocks.entries()) {
        const plain = blockText(node);
        const haystack = caseSensitive ? plain : plain.toLowerCase();
        for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + needle.length)) {
          if (hits.length >= MAX_HITS) return { hits, truncated: true };
          hits.push({
            documentId: summary.id,
            block,
            before: (at > CONTEXT ? "…" : "") + plain.slice(Math.max(0, at - CONTEXT), at),
            match: plain.slice(at, at + query.length),
            after: plain.slice(at + query.length, at + query.length + CONTEXT) + (at + query.length + CONTEXT < plain.length ? "…" : ""),
          });
        }
      }
    }
    return { hits, truncated: false };
  }
}

import { parseMarkdown } from "@marktwain/schema";
import type { SearchHit } from "../../../shared/ipc";
import { blockText, type JsonNode } from "../../helpers/block-text.helper";
import type { DocumentService } from "../document/document.service";

const MAX_HITS = 300;
const CONTEXT = 36;

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
            before: (at > CONTEXT ? "..." : "") + plain.slice(Math.max(0, at - CONTEXT), at),
            match: plain.slice(at, at + query.length),
            after: plain.slice(at + query.length, at + query.length + CONTEXT) + (at + query.length + CONTEXT < plain.length ? "..." : ""),
          });
        }
      }
    }
    return { hits, truncated: false };
  }
}

import { parseMarkdown, serializeMarkdown } from "@marktwain/schema";
import { diffBlocks } from "@marktwain/versioning/sequence";
import type { Node as PmNode } from "@tiptap/pm/model";

/**
 * What differs between the latest saved version of a document and what is in the editor, by top level block.
 * The index of an added or modified mark is that of the block in the editor. A removed mark has no block, it says before which block it was.
 */
export type ChangeMark =
  | { type: "added"; index: number }
  | { type: "modified"; index: number; before: string }
  | { type: "removed"; at: number; before: string };

/** Compares the text of the blocks of the saved version with those of the editor. A replaced block is a modified one, so the old text can be shown above the new. */
export function computeChanges(before: readonly string[], after: readonly string[]): ChangeMark[] {
  const marks: ChangeMark[] = [];
  let index = 0;
  for (const change of diffBlocks(before, after)) {
    if (change.type === "same") index += 1;
    else if (change.type === "added") marks.push({ type: "added", index: index++ });
    else if (change.type === "modified") marks.push({ type: "modified", index: index++, before: change.from });
    else marks.push({ type: "removed", at: index, before: change.hash });
  }
  return marks;
}

const serialized = new WeakMap<PmNode, string>();

/** A block written as Markdown, remembered per node: a node that did not change is the same object, so only what was typed is written again. */
export function blockMarkdown(node: PmNode): string {
  let text = serialized.get(node);
  if (text === undefined) {
    text = serializeMarkdown({ type: "doc", content: [node.toJSON()] } as Parameters<typeof serializeMarkdown>[0]);
    serialized.set(node, text);
  }
  return text;
}

/** The blocks of the editor as Markdown, one text for each top level block. */
export function editorBlocks(doc: PmNode): string[] {
  const out: string[] = [];
  doc.forEach((node) => out.push(blockMarkdown(node)));
  return out;
}

type Json = { type?: string; text?: string; content?: Json[] };

/** The blocks of a saved text as Markdown, written the same way as those of the editor so that the same block gives the same text. */
export function savedBlocks(markdown: string): string[] {
  const content = (parseMarkdown(markdown).content ?? []) as Json[];
  return content.map((node) => serializeMarkdown({ type: "doc", content: [node] } as Parameters<typeof serializeMarkdown>[0]));
}

/** The words of a saved block, for the blocks that are a line of text. Null for a table, a figure or a list, which are marked whole. */
export function savedPlainText(markdown: string): string | null {
  const first = (parseMarkdown(markdown).content ?? [])[0] as Json | undefined;
  if (!first || (first.type !== "paragraph" && first.type !== "heading")) return null;
  const words: string[] = [];
  const walk = (node: Json): void => {
    if (node.text !== undefined) words.push(node.text);
    node.content?.forEach(walk);
  };
  walk(first);
  return words.join("");
}

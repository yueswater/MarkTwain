import { Extension } from "@tiptap/core";
import type { Node as PmNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type Match = { from: number; to: number };

/**
 * Every place that the term appears in the text of the document.
 * Text split by marks such as bold still matches, and a match never runs across an inline atom or a block.
 */
export function findMatches(doc: PmNode, term: string, caseSensitive: boolean): Match[] {
  if (term === "") return [];
  const needle = caseSensitive ? term : term.toLowerCase();
  const matches: Match[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    let text = "";
    const map: number[] = []; // index in text to position in the document
    node.forEach((child, offset) => {
      if (child.isText) {
        for (let i = 0; i < (child.text ?? "").length; i += 1) map.push(pos + 1 + offset + i);
        text += child.text ?? "";
      } else {
        map.push(pos + 1 + offset);
        text += "￼"; // an atom breaks the text
      }
    });
    const haystack = caseSensitive ? text : text.toLowerCase();
    for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + needle.length)) {
      const from = map[at];
      const last = map[at + needle.length - 1];
      if (from !== undefined && last !== undefined) matches.push({ from, to: last + 1 });
    }
    return false;
  });
  return matches;
}

export type FindState = { term: string; caseSensitive: boolean; matches: Match[]; current: number };

export const findKey = new PluginKey<FindState>("marktwainFind");
const EMPTY: FindState = { term: "", caseSensitive: false, matches: [], current: -1 };

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    marktwainFind: {
      /** Starts or changes the search, an empty term clears it */
      setFind: (options: { term: string; caseSensitive?: boolean }) => ReturnType;
      /** Moves to the next match, or the previous one with -1 */
      stepFind: (direction: 1 | -1) => ReturnType;
    };
  }
}

/** Find in the open document: matches are highlighted and the current one is selected. */
export const Find = Extension.create({
  name: "marktwainFind",

  addCommands() {
    return {
      setFind:
        ({ term, caseSensitive = false }) =>
        ({ tr, dispatch, state }) => {
          const matches = findMatches(state.doc, term, caseSensitive);
          // Start at the first match after the cursor
          const after = matches.findIndex((m) => m.from >= state.selection.from);
          const current = matches.length === 0 ? -1 : after === -1 ? 0 : after;
          tr.setMeta(findKey, { term, caseSensitive, matches, current } satisfies FindState);
          if (current >= 0) {
            const match = matches[current]!;
            tr.setSelection(TextSelection.create(state.doc, match.from, match.to)).scrollIntoView();
          }
          if (dispatch) dispatch(tr);
          return true;
        },
      stepFind:
        (direction) =>
        ({ tr, dispatch, state }) => {
          const current = findKey.getState(state) ?? EMPTY;
          if (current.matches.length === 0) return false;
          const next = (current.current + direction + current.matches.length) % current.matches.length;
          const match = current.matches[next]!;
          tr.setMeta(findKey, { ...current, current: next } satisfies FindState);
          tr.setSelection(TextSelection.create(state.doc, match.from, match.to)).scrollIntoView();
          if (dispatch) dispatch(tr);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findKey,
        state: {
          init: () => EMPTY,
          apply(tr, value) {
            const meta = tr.getMeta(findKey) as FindState | undefined;
            if (meta) return meta;
            // Editing keeps the search but recomputes where it matches
            if (tr.docChanged && value.term !== "") {
              const matches = findMatches(tr.doc, value.term, value.caseSensitive);
              return { ...value, matches, current: Math.min(value.current, matches.length - 1) };
            }
            return value;
          },
        },
        props: {
          decorations(state) {
            const { matches, current } = findKey.getState(state) ?? EMPTY;
            return DecorationSet.create(
              state.doc,
              matches.map((match, index) =>
                Decoration.inline(match.from, match.to, { class: index === current ? "find-match find-current" : "find-match" }),
              ),
            );
          },
        },
      }),
    ];
  },
});

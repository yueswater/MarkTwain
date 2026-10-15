import { Extension } from "@tiptap/core";
import { chordOf, tiptapKey } from "../../../../../shared/shortcuts";
import type { SlashHandlers } from "../slash/slash-items";

type Action = (handlers: SlashHandlers) => void;

/** The commands of a thesis that open a dialog, bound to the chords of the shortcut list. The rest are the keys that TipTap gives. */
const ACTIONS: Record<string, Action> = {
  landscape: (h) => h.insertLandscape(),
  table: (h) => h.insertTable(),
  displayMath: (h) => h.insertMath("block"),
  inlineMath: (h) => h.insertMath("inline"),
  image: (h) => h.insertImage(),
  footnote: (h) => h.insertAtom("footnote"),
  citation: (h) => h.insertAtom("citation"),
  crossRef: (h) => h.insertAtom("crossRef"),
};

/** Shortcuts for the actions of the toolbar that have no key of their own in the editor. They do nothing while an input method composes. */
export const ThesisShortcuts = Extension.create<{ handlers: () => SlashHandlers }>({
  name: "thesisShortcuts",

  addOptions() {
    return { handlers: () => ({ insertMath: () => undefined, insertAtom: () => undefined, insertImage: () => undefined, insertTable: () => undefined, insertLandscape: () => undefined }) };
  },

  addKeyboardShortcuts() {
    const keys: Record<string, () => boolean> = {};
    for (const [id, action] of Object.entries(ACTIONS)) {
      const chord = chordOf(id);
      if (!chord) continue;
      keys[tiptapKey(chord)] = () => {
        if (this.editor.view.composing) return false;
        action(this.options.handlers());
        return true;
      };
    }
    return keys;
  },
});

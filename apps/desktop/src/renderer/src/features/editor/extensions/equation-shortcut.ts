import { Extension } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { OPEN_EQUATION_LABEL_EVENT } from "../EquationLabelBubble";

/** Mod-Alt-N opens the name box of the selected display formula, for the keyboard. */
export const EquationShortcut = Extension.create({
  name: "equationShortcut",

  addKeyboardShortcuts() {
    return {
      "Mod-Alt-n": () => {
        const { selection } = this.editor.state;
        if (!(selection instanceof NodeSelection) || selection.node.type.name !== "blockMath") return false;
        document.dispatchEvent(new CustomEvent(OPEN_EQUATION_LABEL_EVENT, { detail: { pos: selection.from } }));
        return true;
      },
    };
  },
});

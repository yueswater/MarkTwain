import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * Marks the editor with data-typing while the author types, and clears it when the mouse moves.
 * Controls that float over the text use it to stay out of the way during typing.
 */
export const TypingState = Extension.create({
  name: "typingState",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("marktwainTypingState"),
        props: {
          handleDOMEvents: {
            keydown: (view, event) => {
              // Shortcuts and bare modifier keys are not typing
              if (event.metaKey || event.ctrlKey || event.altKey || ["Shift", "Control", "Alt", "Meta", "Escape", "Tab"].includes(event.key)) return false;
              view.dom.setAttribute("data-typing", "true");
              return false;
            },
            mousemove: (view) => {
              if (view.dom.hasAttribute("data-typing")) view.dom.removeAttribute("data-typing");
              return false;
            },
          },
        },
      }),
    ];
  },
});

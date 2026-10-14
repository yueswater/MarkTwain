import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CODE_LANGUAGES, lowlight, languageLabel } from "../../code-languages";

const PLAIN = "plain";

/** Name of the event that opens the selector of the block at a position, sent by the keyboard shortcut. */
export const OPEN_LANGUAGE_EVENT = "marktwain:code-language";

function CodeBlockView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const { t } = useTranslation("editor");
  const [open, setOpen] = useState(false);
  const language = String(node.attrs.language ?? "");

  // The shortcut cannot reach React state directly, it sends an event with the position of the block
  useEffect(() => {
    const listener = (event: Event) => {
      if ((event as CustomEvent<{ pos: number }>).detail.pos === getPos()) setOpen(true);
    };
    document.addEventListener(OPEN_LANGUAGE_EVENT, listener);
    return () => document.removeEventListener(OPEN_LANGUAGE_EVENT, listener);
  }, [getPos]);

  function choose(value: string): void {
    updateAttributes({ language: value === PLAIN ? null : value });
  }

  /** Puts the cursor back into this block, the author was typing in it or is about to. */
  function returnFocus(): void {
    // The trigger sits inside the editor, so the editor believes it has focus. Leave the trigger first.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const pos = getPos();
    if (typeof pos === "number") editor.chain().focus().setTextSelection(pos + 1).run();
    else editor.commands.focus();
  }

  return (
    <NodeViewWrapper className="code-block">
      <div className="code-lang" contentEditable={false} data-open={open} data-testid="code-language">
        <Select value={language || PLAIN} onValueChange={choose} open={open} onOpenChange={setOpen}>
          <SelectTrigger size="sm" aria-label={t("toolbar.codeLanguage")} className="h-6 w-auto gap-1 border-0 bg-background/80 px-2 text-xs shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            align="end"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              returnFocus();
            }}
          >
            <SelectItem value={PLAIN}>{t("toolbar.plainText")}</SelectItem>
            {CODE_LANGUAGES.map((item) => (
              <SelectItem key={item} value={item}>
                {languageLabel(item)}
              </SelectItem>
            ))}
            {language && !(CODE_LANGUAGES as readonly string[]).includes(language) && <SelectItem value={language}>{language}</SelectItem>}
          </SelectContent>
        </Select>
      </div>
      <pre>
        <NodeViewContent<"code"> as="code" />
      </pre>
    </NodeViewWrapper>
  );
}

/** The code block with its language selector on the block, shown on hover and hidden while typing. */
export const CodeBlockWithLanguage = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      // Opens the language list of the block that holds the cursor
      "Mod-Alt-l": () => {
        const { $from } = this.editor.state.selection;
        if ($from.parent.type.name !== "codeBlock") return false;
        document.dispatchEvent(new CustomEvent(OPEN_LANGUAGE_EVENT, { detail: { pos: $from.before() } }));
        return true;
      },
    };
  },
}).configure({ lowlight, defaultLanguage: null });

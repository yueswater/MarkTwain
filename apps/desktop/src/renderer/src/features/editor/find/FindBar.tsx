import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { CaseSensitiveIcon, ChevronDownIcon, ChevronUpIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { findKey } from "../extensions/find";

type Props = {
  editor: Editor;
  /** Text to start with, the selection or the term of a project search */
  initialTerm: string;
  onClose: () => void;
};

/** The find bar in the corner of the editor, Enter goes to the next match and Shift plus Enter to the previous. */
export function FindBar({ editor, initialTerm, onClose }: Props) {
  const { t } = useTranslation("editor");
  const [term, setTerm] = useState(initialTerm);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const find = findKey.getState(e.state);
      return { count: find?.matches.length ?? 0, current: find?.current ?? -1 };
    },
  });

  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);

  useEffect(() => {
    editor.commands.setFind({ term, caseSensitive });
    // The bar owns the search while it is open
  }, [editor, term, caseSensitive]);

  // Closing clears the highlights
  useEffect(() => () => void editor.commands.setFind({ term: "" }), [editor]);

  const step = (direction: 1 | -1) => editor.commands.stepFind(direction);

  return (
    <div
      role="search"
      aria-label={t("find.label")}
      className="absolute top-2 right-6 z-20 flex items-center gap-1 rounded-lg border bg-popover p-1 shadow-md"
    >
      <Input
        ref={input}
        value={term}
        placeholder={t("find.placeholder")}
        aria-label={t("find.label")}
        className="h-7 w-52 px-2 text-sm md:text-sm"
        onChange={(event) => setTerm(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            step(event.shiftKey ? -1 : 1);
          } else if (event.key === "Escape") {
            event.preventDefault();
            onClose();
            editor.commands.focus();
          }
        }}
      />
      <span className="min-w-12 text-center text-xs text-muted-foreground tabular-nums" aria-live="polite" data-testid="find-count">
        {term === "" ? "" : state.count === 0 ? t("find.none") : `${state.current + 1} / ${state.count}`}
      </span>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={t("find.caseSensitive")}
        title={t("find.caseSensitive")}
        aria-pressed={caseSensitive}
        className={cn(caseSensitive && "bg-muted")}
        onClick={() => setCaseSensitive((value) => !value)}
      >
        <CaseSensitiveIcon aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="icon-xs" aria-label={t("find.previous")} title={t("find.previous")} disabled={state.count === 0} onClick={() => step(-1)}>
        <ChevronUpIcon aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="icon-xs" aria-label={t("find.next")} title={t("find.next")} disabled={state.count === 0} onClick={() => step(1)}>
        <ChevronDownIcon aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={t("find.close")}
        title={t("find.close")}
        onClick={() => {
          onClose();
          editor.commands.focus();
        }}
      >
        <XIcon aria-hidden="true" />
      </Button>
    </div>
  );
}

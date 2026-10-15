import { XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SEPARATORS = /[,，、]/;

type Props = {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  /** The name of the button that takes a tag away, given the tag */
  removeLabel: (tag: string) => string;
  placeholder?: string;
  className?: string;
};

/** A list of words written as hashtags: Enter or a comma turns the typed word into a tag, a cross or Backspace takes one away. */
export function TagInput({ id, value, onChange, removeLabel, placeholder, className }: Props) {
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const add = (words: string[]) => {
    const next = [...value];
    for (const word of words.map((w) => w.trim().replace(/^#+/, "").trim()).filter(Boolean)) {
      if (!next.some((tag) => tag.toLowerCase() === word.toLowerCase())) next.push(word);
    }
    if (next.length !== value.length) onChange(next);
  };

  const commit = () => {
    add([draft]);
    setDraft("");
  };

  return (
    <div
      className={cn(
        "flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        className,
      )}
      onClick={() => input.current?.focus()}
    >
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-0.5 rounded-full bg-muted py-0.5 pl-2 pr-1 text-sm" data-tag={tag}>
          <span className="text-muted-foreground">#</span>
          {tag}
          <button
            type="button"
            aria-label={removeLabel(tag)}
            className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              onChange(value.filter((item) => item !== tag));
            }}
          >
            <XIcon className="size-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        ref={input}
        id={id}
        value={draft}
        placeholder={value.length === 0 ? placeholder : undefined}
        spellCheck={false}
        className="min-w-24 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground"
        onChange={(event) => {
          const text = event.target.value;
          if (!SEPARATORS.test(text)) return setDraft(text);
          // Every word before the last separator is done, what follows it is still being typed
          const parts = text.split(SEPARATORS);
          add(parts.slice(0, -1));
          setDraft(parts.at(-1) ?? "");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (!event.nativeEvent.isComposing) commit();
          } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
      />
    </div>
  );
}

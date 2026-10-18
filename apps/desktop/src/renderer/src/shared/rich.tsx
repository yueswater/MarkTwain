import { Fragment, type ReactNode } from "react";

/** Locale strings mark bold with <b>…</b> and code, such as commands, keys and placeholders, with <c>…</c>. */
const TAG = /<(b|c)>(.*?)<\/\1>/g;

/** The text without its markup, for places that cannot style text, such as labels, titles and saved names. */
export function plain(text: string): string {
  return text.replace(TAG, "$2");
}

/** The text with bold and code spans, for places that render markup. */
export function rich(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TAG)) {
    const at = match.index ?? 0;
    if (at > last) nodes.push(text.slice(last, at));
    nodes.push(
      match[1] === "b" ? (
        <strong key={at} className="font-semibold">
          {match[2]}
        </strong>
      ) : (
        <code key={at} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] font-normal">
          {match[2]}
        </code>
      ),
    );
    last = at + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Rich({ text }: { text: string }) {
  return <Fragment>{rich(text)}</Fragment>;
}

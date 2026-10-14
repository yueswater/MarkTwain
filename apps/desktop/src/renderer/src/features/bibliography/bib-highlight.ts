export type BibTokenKind = "type" | "key" | "field" | "string" | "number" | "comment" | "punct" | "text";

export type BibToken = { kind: BibTokenKind; text: string };

const WORD = /[A-Za-z0-9_:.+/-]/;

/**
 * Splits BibTeX source into tokens for coloring. It never changes the text: joining the tokens gives the source back.
 * It does not judge the file, a broken entry is colored as far as it can be read.
 */
export function tokenizeBibtex(source: string): BibToken[] {
  const tokens: BibToken[] = [];
  const push = (kind: BibTokenKind, text: string) => {
    if (text === "") return;
    const last = tokens[tokens.length - 1];
    // Neighbours of one kind are one token, so the result stays small
    if (last && last.kind === kind && kind !== "punct") last.text += text;
    else tokens.push({ kind, text });
  };

  let i = 0;
  const n = source.length;
  /** Reads a group in braces, with nested braces and escapes, and returns its end. */
  const braced = (from: number): number => {
    let depth = 0;
    for (let j = from; j < n; j += 1) {
      const ch = source[j]!;
      if (ch === "\\") j += 1;
      else if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) return j + 1;
      }
    }
    return n;
  };

  while (i < n) {
    const ch = source[i]!;
    // Text between entries is a comment of BibTeX, a line that starts with % too
    if (ch !== "@") {
      const next = source.indexOf("@", i);
      const end = next === -1 ? n : next;
      const chunk = source.slice(i, end);
      for (const part of chunk.split(/(\n)/)) push(part.trimStart().startsWith("%") || part.trim() !== "" ? "comment" : "text", part);
      i = end;
      continue;
    }
    const head = /^@\s*([A-Za-z]+)/.exec(source.slice(i, i + 40));
    if (!head) {
      push("text", ch);
      i += 1;
      continue;
    }
    push("type", head[0]);
    i += head[0].length;
    const space = /^\s*/.exec(source.slice(i))![0];
    push("text", space);
    i += space.length;
    const open = source[i];
    if (open !== "{" && open !== "(") continue;
    push("punct", open);
    i += 1;
    const close = open === "{" ? "}" : ")";
    const lower = head[1]!.toLowerCase();
    if (lower === "comment" || lower === "preamble" || lower === "string") {
      // These blocks are not entries, their content is shown as it is
      let depth = 1;
      let j = i;
      for (; j < n && depth > 0; j += 1) {
        if (source[j] === open) depth += 1;
        else if (source[j] === close) depth -= 1;
      }
      push("comment", source.slice(i, depth === 0 ? j - 1 : j));
      if (depth === 0) push("punct", close);
      i = j;
      continue;
    }
    // The key, up to the first comma
    const keyEnd = (() => {
      let j = i;
      while (j < n && source[j] !== "," && source[j] !== close && source[j] !== "\n") j += 1;
      return j;
    })();
    push("key", source.slice(i, keyEnd));
    i = keyEnd;
    // The fields
    while (i < n) {
      const c = source[i]!;
      if (c === close) {
        push("punct", c);
        i += 1;
        break;
      }
      if (c === "," || c === "=" || c === "#") {
        push("punct", c);
        i += 1;
      } else if (/\s/.test(c)) {
        push("text", c);
        i += 1;
      } else if (c === "{") {
        const end = braced(i);
        push("string", source.slice(i, end));
        i = end;
      } else if (c === '"') {
        let j = i + 1;
        let depth = 0;
        for (; j < n; j += 1) {
          const d = source[j]!;
          if (d === "\\") j += 1;
          else if (d === "{") depth += 1;
          else if (d === "}") depth -= 1;
          else if (d === '"' && depth === 0) break;
        }
        push("string", source.slice(i, Math.min(j + 1, n)));
        i = Math.min(j + 1, n);
      } else if (WORD.test(c)) {
        let j = i;
        while (j < n && WORD.test(source[j]!)) j += 1;
        const word = source.slice(i, j);
        // A word before an equals sign is a field name, a number or a macro is a value
        const after = /^\s*(=?)/.exec(source.slice(j))![1];
        push(after === "=" ? "field" : /^\d+$/.test(word) ? "number" : "string", word);
        i = j;
      } else if (c === "@") {
        // A new entry starts, the broken one is left open
        break;
      } else {
        push("text", c);
        i += 1;
      }
    }
  }
  return tokens;
}

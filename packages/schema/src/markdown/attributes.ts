/** Attributes in pandoc style, {#id .class key=value key="with space"}, see section 4.3 of the spec. */
export type Attributes = {
  id: string | null;
  classes: string[];
  props: Record<string, string>;
};

const KEY = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const BARE_VALUE = /^[^\s"{}\\]+$/;

/**
 * Parses the content between braces, without the braces themselves. Returns null on bad format,
 * so the caller can treat the whole text as plain text instead of throwing.
 */
export function parseAttributes(inner: string): Attributes | null {
  const result: Attributes = { id: null, classes: [], props: {} };
  let i = 0;
  const n = inner.length;

  while (i < n) {
    const ch = inner.charAt(i);
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (ch === "#" || ch === ".") {
      let j = i + 1;
      while (j < n && !/[\s{}"]/.test(inner.charAt(j))) j += 1;
      const name = inner.slice(i + 1, j);
      if (name === "") return null;
      if (ch === "#") {
        if (result.id !== null) return null;
        result.id = name;
      } else {
        result.classes.push(name);
      }
      i = j;
      continue;
    }

    // key=value
    let j = i;
    while (j < n && inner.charAt(j) !== "=" && !/\s/.test(inner.charAt(j))) j += 1;
    const key = inner.slice(i, j);
    if (!KEY.test(key) || inner.charAt(j) !== "=") return null;
    j += 1;

    if (inner.charAt(j) === '"') {
      j += 1;
      let value = "";
      let closed = false;
      while (j < n) {
        const c = inner.charAt(j);
        if (c === "\\" && j + 1 < n) {
          value += inner.charAt(j + 1);
          j += 2;
        } else if (c === '"') {
          closed = true;
          j += 1;
          break;
        } else {
          value += c;
          j += 1;
        }
      }
      if (!closed) return null;
      result.props[key] = value;
    } else {
      let k = j;
      while (k < n && !/\s/.test(inner.charAt(k))) k += 1;
      const value = inner.slice(j, k);
      if (/["{}]/.test(value)) return null;
      result.props[key] = value;
      j = k;
    }
    i = j;
  }

  return result;
}

function formatValue(value: string): string {
  if (BARE_VALUE.test(value)) return value;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Canonical form, id, then classes in order, then key=value with keys sorted alphabetically. Returns an empty string when there are no attributes. */
export function formatAttributes(attributes: Attributes): string {
  const parts: string[] = [];
  if (attributes.id !== null) parts.push(`#${attributes.id}`);
  for (const name of attributes.classes) parts.push(`.${name}`);
  for (const key of Object.keys(attributes.props).sort()) {
    parts.push(`${key}=${formatValue(attributes.props[key] ?? "")}`);
  }
  return parts.length === 0 ? "" : `{${parts.join(" ")}}`;
}

/**
 * Cuts the block of attributes off the end of a line, braces and quotes inside a quoted value belong to the value.
 * Returns where the block starts and what is between its braces, null when the line does not end in one.
 * A brace in the text before it, such as "Caption {x} {#tbl:a}", is not taken for the start.
 */
export function splitTrailingAttributes(text: string): { index: number; inner: string } | null {
  const end = text.trimEnd().length;
  if (end === 0 || text.charAt(end - 1) !== "}") return null;
  for (let start = 0; start < end; start += 1) {
    if (text.charAt(start) !== "{") continue;
    let depth = 0;
    let quoted = false;
    let balancedAt = -1;
    for (let i = start; i < end; i += 1) {
      const ch = text.charAt(i);
      if (quoted) {
        if (ch === "\\") i += 1;
        else if (ch === '"') quoted = false;
        continue;
      }
      if (ch === '"') quoted = true;
      else if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          balancedAt = i;
          break;
        }
      }
    }
    if (balancedAt === end - 1) {
      // Leading spaces belong to the separator, not to the text before
      let from = start;
      while (from > 0 && /\s/.test(text.charAt(from - 1))) from -= 1;
      return { index: from, inner: text.slice(start + 1, end - 1) };
    }
  }
  return null;
}

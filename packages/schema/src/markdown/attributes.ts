/** pandoc 風格的屬性：`{#id .class key=value key="含 空白"}`（規格 4.3 節）。 */
export type Attributes = {
  id: string | null;
  classes: string[];
  props: Record<string, string>;
};

const KEY = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const BARE_VALUE = /^[^\s"{}\\]+$/;

/**
 * 解析大括號內的內容（不含大括號本身）。格式錯誤時回傳 null，
 * 讓呼叫端把整段當成一般文字，而不是丟出例外。
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

/** 規範形式：id、class（依序）、key=value（key 依字母順序）。沒有屬性時回傳空字串。 */
export function formatAttributes(attributes: Attributes): string {
  const parts: string[] = [];
  if (attributes.id !== null) parts.push(`#${attributes.id}`);
  for (const name of attributes.classes) parts.push(`.${name}`);
  for (const key of Object.keys(attributes.props).sort()) {
    parts.push(`${key}=${formatValue(attributes.props[key] ?? "")}`);
  }
  return parts.length === 0 ? "" : `{${parts.join(" ")}}`;
}

import type { MarkdownItInstance } from "../markdown-it";

type StateInline = InstanceType<MarkdownItInstance["inline"]["State"]>;

/** Prefixes of cross-reference labels, bibliography keys may not start with them, see section 4.3 of the spec. */
const XREF_PREFIX = /^(?:cha|sec|fig|tbl|eq|lst):/;

/** A plain key, letters, digits and underscores, inside it : . - / + are allowed but must be followed by a letter or digit. */
const SIMPLE_KEY = "[A-Za-z0-9_](?:[A-Za-z0-9_]|[:.\\-/+](?=[A-Za-z0-9_]))*";
const BARE_KEY = new RegExp(`^${SIMPLE_KEY}`);
const ITEM = new RegExp(`^(-?)@(?:\\{([^{}\\s]+)\\}|(${SIMPLE_KEY}))$`);

const AT = 0x40;
const OPEN_BRACKET = 0x5b;

function isXref(key: string): boolean {
  return XREF_PREFIX.test(key);
}

function pushCitation(state: StateInline, keys: string[], form: string): void {
  const token = state.push("citation", "cite", 0);
  token.meta = { keys, form };
}

function pushCrossRef(state: StateInline, label: string): void {
  const token = state.push("cross_ref", "ref", 0);
  token.content = label;
}

/** [@a; @b], [-@a] and [@a]{.author}, while a single [@fig:x] is a cross-reference. */
function bracketForm(state: StateInline, silent: boolean): boolean {
  const src = state.src;
  const start = state.pos;
  const close = src.indexOf("]", start + 1);
  if (close === -1 || close >= state.posMax) return false;

  const inner = src.slice(start + 1, close);
  if (inner.includes("[") || !/^\s*-?@/.test(inner)) return false;

  const items = inner.split(";").map((item) => ITEM.exec(item.trim()));
  if (items.some((item) => item === null)) return false;
  const parsed = items.map((item) => ({ minus: item?.[1] === "-", key: item?.[2] ?? item?.[3] ?? "" }));
  const keys = parsed.map((item) => item.key);

  let end = close + 1;
  if (keys.some(isXref)) {
    if (keys.length !== 1 || parsed[0]?.minus) return false;
    if (!silent) pushCrossRef(state, keys[0] ?? "");
    state.pos = end;
    return true;
  }

  let form = parsed.every((item) => item.minus) ? "year" : "paren";
  if (keys.length === 1 && !parsed[0]?.minus && src.startsWith("{.author}", end)) {
    form = "author";
    end += "{.author}".length;
  }

  if (!silent) pushCitation(state, keys, form);
  state.pos = end;
  return true;
}

/** Narrative @key and @{key}, and @fig:x. */
function bareForm(state: StateInline, silent: boolean): boolean {
  const src = state.src;
  const start = state.pos;
  const afterAt = start + 1;

  let key: string;
  let end: number;
  const braces = /^\{([^{}\s]+)\}/.exec(src.slice(afterAt, state.posMax));
  if (braces) {
    // The brace form is explicit, the previous character is not checked
    key = braces[1] ?? "";
    end = afterAt + braces[0].length;
  } else {
    if (start > 0 && /\w/.test(src.charAt(start - 1))) return false;
    const match = BARE_KEY.exec(src.slice(afterAt, state.posMax));
    if (!match) return false;
    key = match[0];
    end = afterAt + key.length;
  }

  if (!silent) {
    if (isXref(key)) pushCrossRef(state, key);
    else pushCitation(state, [key], "prose");
  }
  state.pos = end;
  return true;
}

function citation(state: StateInline, silent: boolean): boolean {
  const code = state.src.charCodeAt(state.pos);
  if (code === OPEN_BRACKET) return bracketForm(state, silent);
  if (code === AT) return bareForm(state, silent);
  return false;
}

export function citationPlugin(md: MarkdownItInstance): void {
  // Before link, so that a citation followed by a parenthesis is not taken as a link
  md.inline.ruler.before("link", "citation", citation);
}

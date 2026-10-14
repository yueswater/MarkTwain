export type EscapeContext = {
  /** 這段文字是否在一行的開頭（段落開頭、清單項目開頭、硬換行之後） */
  startOfLine: boolean;
  /** 是否在標題裡：標題結尾的 `#` 序列會被當成關閉記號 */
  inHeading: boolean;
  /** 是否在表格儲存格裡：`|` 是欄位分隔 */
  inTableCell?: boolean;
};

/** 看起來像字元實體的 `&…;`（`&amp;`、`&#35;`、`&#x23;`）。 */
const ENTITY = /^&(#\d+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);/;

/**
 * `@` 後面接字或大括號、而且前面不是字時，可能被當成引用或交叉引用（規格 4.3 節）。
 * 字中間的 `@`（電子郵件）與單獨的 `@` 不用跳脫。
 */
function startsCitation(text: string, index: number): boolean {
  const previous = index > 0 ? text.charAt(index - 1) : "";
  const next = text.charAt(index + 1);
  return !/\w/.test(previous) && (/\w/.test(next) || next === "{");
}

/**
 * 把純文字跳脫成不會被解析成標記的 Markdown。範圍涵蓋 CommonMark 的行內與行首規則，
 * 加上本方言的屬性 `{…}`、公式 `$` 與圍欄 div / 定義清單的行首 `:`（規格 4.3 節）。
 * 往返的屬性測試會驗證：任何文字跳脫後再解析，都得到原本的文字。
 */
export function escapeText(text: string, context: EscapeContext): string {
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charAt(i);

    if ("`*\\~[]<{}$".includes(ch)) {
      out += `\\${ch}`;
    } else if (ch === "_") {
      // 字中間的底線（snake_case）不用跳脫；鄰居必須是英數字，連續的底線彼此不算
      const intraword =
        i > 0 &&
        i + 1 < text.length &&
        /[A-Za-z0-9]/.test(text.charAt(i - 1)) &&
        /[A-Za-z0-9]/.test(text.charAt(i + 1));
      out += intraword ? ch : "\\_";
    } else if (ch === "@" && startsCitation(text, i)) {
      out += "\\@";
    } else if (ch === "&" && ENTITY.test(text.slice(i))) {
      out += "\\&";
    } else if (ch === "|" && context.inTableCell) {
      out += "\\|";
    } else if (ch === "#" && context.inHeading) {
      out += "\\#";
    } else {
      out += ch;
    }
  }

  return context.startOfLine ? escapeLineStart(out) : out;
}

/** 行首會被當成區塊標記（標題、清單、引用、定義、div 圍欄）的字元要跳脫。 */
export function escapeLineStart(text: string): string {
  return text
    .replace(/^(\s*)(#{1,6})(\s|$)/, "$1\\$2$3")
    .replace(/^([+\-=>:])/, "\\$1")
    .replace(/^(\d+)([.)])/, "$1\\$2");
}

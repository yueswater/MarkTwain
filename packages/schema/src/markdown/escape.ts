export type EscapeContext = {
  /** 這段文字是否在一行的開頭（段落開頭、清單項目開頭、硬換行之後） */
  startOfLine: boolean;
  /** 是否在標題裡：標題結尾的 `#` 序列會被當成關閉記號 */
  inHeading: boolean;
};

/** 看起來像字元實體的 `&…;`（`&amp;`、`&#35;`、`&#x23;`）。 */
const ENTITY = /^&(#\d+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);/;

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
      const intraword =
        i > 0 && i + 1 < text.length && /\w/.test(text.charAt(i - 1)) && /\w/.test(text.charAt(i + 1));
      out += intraword ? ch : "\\_";
    } else if (ch === "&" && ENTITY.test(text.slice(i))) {
      out += "\\&";
    } else if (ch === "#" && context.inHeading) {
      out += "\\#";
    } else {
      out += ch;
    }
  }

  if (context.startOfLine) {
    out = out
      .replace(/^(\s*)(#{1,6})(\s|$)/, "$1\\$2$3")
      .replace(/^([+\-=>:])/, "\\$1")
      .replace(/^(\d+)([.)])/, "$1\\$2");
  }
  return out;
}

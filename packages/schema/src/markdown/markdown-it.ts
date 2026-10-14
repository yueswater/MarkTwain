import MarkdownIt from "markdown-it";
import attrs from "markdown-it-attrs";
import footnote from "markdown-it-footnote";
import { citationPlugin } from "./plugins/citation";
import { deflistPlugin } from "./plugins/deflist";
import { divPlugin } from "./plugins/div";
import { figuresPlugin } from "./plugins/figures";
import { footnoteResolvePlugin } from "./plugins/footnote";
import { mathPlugin } from "./plugins/math";
import { tablesPlugin } from "./plugins/tables";

/**
 * 方言的 markdown-it 實例（規格 4.3 節）。後續的小節會在這裡加入腳註、
 * 定義清單與自寫的外掛。關閉原始 HTML 與自動連結：內容一律當作文字。
 */
export type MarkdownItInstance = InstanceType<typeof MarkdownIt>;

export function createMarkdownIt(): MarkdownItInstance {
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false, breaks: false });
  // 路徑與網址保持原樣：預設會把非 ASCII 字元百分比編碼（`圖.png` 變成 `%E5%9C%96.png`），
  // 專案裡的圖片路徑要原樣保存與寫回。
  md.normalizeLink = (url) => url;
  md.normalizeLinkText = (url) => url;

  return md
    .use(attrs)
    .use(footnote)
    .use(deflistPlugin)
    .use(mathPlugin)
    .use(citationPlugin)
    .use(divPlugin)
    .use(footnoteResolvePlugin)
    .use(tablesPlugin)
    .use(figuresPlugin);
}

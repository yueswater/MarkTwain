import MarkdownIt from "markdown-it";
import attrs from "markdown-it-attrs";
import { mathPlugin } from "./plugins/math";

/**
 * 方言的 markdown-it 實例（規格 4.3 節）。後續的小節會在這裡加入腳註、
 * 定義清單與自寫的外掛。關閉原始 HTML 與自動連結：內容一律當作文字。
 */
export type MarkdownItInstance = InstanceType<typeof MarkdownIt>;

export function createMarkdownIt(): MarkdownItInstance {
  return new MarkdownIt({ html: false, linkify: false, typographer: false, breaks: false })
    .use(attrs)
    .use(mathPlugin);
}

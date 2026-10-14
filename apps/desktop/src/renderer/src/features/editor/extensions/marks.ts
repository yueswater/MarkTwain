import { markInputRule, markPasteRule } from "@tiptap/core";
import { Bold } from "@tiptap/extension-bold";
import { Italic } from "@tiptap/extension-italic";
import { Strike } from "@tiptap/extension-strike";

/**
 * 中文與日文沒有空白分詞，所以「這是**重點**內文」的 `**` 前面是文字而不是空白。
 * TipTap 預設的強調輸入規則要求前面是行首或空白，在中文裡幾乎不會觸發；
 * 這裡去掉那個條件，改用 lookbehind 避免 `**` 的第一個 `*` 被當成斜體；內容的頭尾不能是空白（`2 * 3 * `不是斜體）。
 */
export const BOLD_INPUT = /(\*\*(?!\s)([^*]*[^*\s])\*\*)$/;
export const ITALIC_INPUT = /((?<!\*)\*(?![\s*])([^*]*[^*\s])\*)$/;
export const STRIKE_INPUT = /(~~(?!\s)([^~]*[^~\s])~~)$/;

export const CjkBold = Bold.extend({
  addInputRules() {
    return [markInputRule({ find: BOLD_INPUT, type: this.type })];
  },
  addPasteRules() {
    return [markPasteRule({ find: /(?:\*\*)([^*]+)(?:\*\*)/g, type: this.type })];
  },
});

export const CjkItalic = Italic.extend({
  addInputRules() {
    return [markInputRule({ find: ITALIC_INPUT, type: this.type })];
  },
  addPasteRules() {
    return [markPasteRule({ find: /(?<!\*)\*([^*]+)\*(?!\*)/g, type: this.type })];
  },
});

export const CjkStrike = Strike.extend({
  addInputRules() {
    return [markInputRule({ find: STRIKE_INPUT, type: this.type })];
  },
  addPasteRules() {
    return [markPasteRule({ find: /(?:~~)([^~]+)(?:~~)/g, type: this.type })];
  },
});

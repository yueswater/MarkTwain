import { markInputRule, markPasteRule } from "@tiptap/core";
import { Bold } from "@tiptap/extension-bold";
import { Italic } from "@tiptap/extension-italic";
import { Strike } from "@tiptap/extension-strike";

/**
 * Chinese and Japanese have no spaces between words, so the ** in text followed by bold and more text is preceded by a character and not a space.
 * The default emphasis input rules of TipTap need a line start or a space before the marker and almost never fire in Chinese.
 * The prefix condition is dropped and a lookbehind keeps the first star of ** from becoming italic. The content may not start or end with a space.
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

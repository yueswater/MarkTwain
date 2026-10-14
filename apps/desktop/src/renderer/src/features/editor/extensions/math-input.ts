import { Extension, InputRule } from "@tiptap/core";

/**
 * 行內公式的輸入規則：輸入 `$x^2$` 的結尾 `$` 時變成公式。
 * 與 pandoc 的規則一致：開頭的 `$` 後面與結尾的 `$` 前面都不能是空白（所以「價格 $5 與 $6」不會誤觸發），
 * 前面不能是 `$`（留給獨立公式）或反斜線（跳脫）。中文緊貼 `$` 也可以。
 * TipTap Mathematics 內建的規則只認 `$$…$$`，與我們的方言（規格 4.3）不同。
 */
export const INLINE_MATH_INPUT = /(?<![$\\])\$([^$\s](?:[^$\n]*[^$\s])?)\$$/;

export const MathInputRules = Extension.create({
  name: "mathInputRules",

  addInputRules() {
    return [
      new InputRule({
        find: INLINE_MATH_INPUT,
        handler: ({ state, range, match }) => {
          const type = state.schema.nodes.inlineMath;
          const latex = match[1];
          if (!type || !latex) return null;
          state.tr.replaceWith(range.from, range.to, type.create({ latex }));
        },
      }),
    ];
  },
});

import { Extension, InputRule } from "@tiptap/core";

/**
 * Input rule for inline formulas, typing the closing dollar of dollar x caret 2 dollar turns it into a formula.
 * Same as pandoc, no space after the opening dollar or before the closing one, so prices do not trigger it.
 * The opening dollar may not follow another dollar, which is left for block formulas, or a backslash. Chinese text directly next to a dollar works.
 * The built-in rule of TipTap Mathematics only knows double dollars, which differs from our dialect.
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

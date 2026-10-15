import { Extension } from "@tiptap/core";

/**
 * Adds the attributes our schema needs to built-in TipTap nodes and marks, see @marktwain/schema:
 * They are labels of headings and code blocks, captions of code, titles of links, captions and notes of tables and alignment of cells.
 * Global attributes are used instead of replacing built-in extensions, so built-in behavior and shortcuts stay unchanged.
 */
const text = (name: string, fallback: string | null = null) => ({
  default: fallback,
  parseHTML: (element: HTMLElement) => element.getAttribute(`data-${name}`) ?? fallback,
  renderHTML: (attributes: Record<string, unknown>) =>
    attributes[name] ? { [`data-${name}`]: String(attributes[name]) } : {},
});

export const GlobalAttributes = Extension.create({
  name: "marktwainAttributes",

  addGlobalAttributes() {
    return [
      { types: ["heading"], attributes: { label: text("label") } },
      { types: ["codeBlock"], attributes: { label: text("label"), caption: text("caption") } },
      { types: ["link"], attributes: { title: text("title") } },
      {
        types: ["table"],
        attributes: {
          label: text("label"),
          caption: text("caption", ""),
          notes: text("notes", ""),
          style: text("style", "three-line"),
          widths: text("widths", ""),
          placement: text("placement"),
          borders: text("borders", ""),
          width: text("width"),
          size: text("size"),
        },
      },
      {
        types: ["tableRow"],
        attributes: {
          height: {
            default: null,
            parseHTML: (element: HTMLElement) => element.getAttribute("data-height"),
            renderHTML: (attributes: Record<string, unknown>) =>
              attributes.height
                ? { "data-height": String(attributes.height), style: `height: ${String(attributes.height)}` }
                : {},
          },
        },
      },
      { types: ["tableHeader", "tableCell"], attributes: { align: text("align"), valign: text("valign") } },
      { types: ["blockMath"], attributes: { label: text("label") } },
    ];
  },
});

import { Node } from "@tiptap/core";

/** 專案內的檔案以自訂協定顯示（main/core/asset-protocol.ts）。 */
export function assetUrl(src: string): string {
  return `marktwain-asset://project/${src.split("/").map(encodeURIComponent).join("/")}`;
}

const data = (name: string, fallback: string | null = null) => ({
  default: fallback,
  parseHTML: (element: HTMLElement) => element.getAttribute(`data-${name}`) ?? fallback,
  renderHTML: (attributes: Record<string, unknown>) =>
    attributes[name] ? { [`data-${name}`]: String(attributes[name]) } : {},
});

/** 圖：獨立成段的圖片。caption 是行內 Markdown 原文；width 例如 "60%"。 */
export const Figure = Node.create({
  name: "figure",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: data("src", ""),
      caption: data("caption", ""),
      label: data("label"),
      width: data("width"),
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-figure]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, caption, width } = node.attrs as { src: string; caption: string; width: string | null };
    return [
      "figure",
      { ...HTMLAttributes, "data-figure": "" },
      [
        "img",
        {
          src: assetUrl(src),
          alt: caption,
          ...(width ? { style: `width: ${width}` } : {}),
        },
      ],
      ...(caption ? ([["figcaption", {}, caption]] as const) : []),
    ];
  },
});

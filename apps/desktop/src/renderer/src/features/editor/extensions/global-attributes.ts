import { Extension } from "@tiptap/core";

/**
 * 替 TipTap 內建的節點與標記加上我們的 schema 需要的屬性（`@marktwain/schema`）：
 * 標題與程式碼區塊的標籤、程式碼的標題、連結的 title、表格的標題與附註、儲存格的對齊。
 * 用 global attributes 而不是替換內建擴充，內建的行為與快捷鍵都維持原樣。
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
        attributes: { label: text("label"), caption: text("caption", ""), notes: text("notes", "") },
      },
      { types: ["tableHeader", "tableCell"], attributes: { align: text("align") } },
      { types: ["blockMath"], attributes: { label: text("label") } },
    ];
  },
});

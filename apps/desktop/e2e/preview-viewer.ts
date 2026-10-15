import type { Page } from "@playwright/test";

/** Finds the PDF viewer of the preview, it is a web component with its own shadow tree, and reads what it shows. */
const FIND = `
  const find = (root) => {
    for (const el of root.querySelectorAll("*")) {
      if (el.registry) return el;
      if (el.shadowRoot) { const found = find(el.shadowRoot); if (found) return found; }
    }
    return null;
  };
  const container = find(document);
  if (!container) return null;
  const registry = await container.registry;
  const scroll = registry.getPlugin("scroll").provides();
  const docs = registry.getPlugin("document-manager").provides();
  const id = docs.getActiveDocumentId();
  if (!id) return null;
`;

export type ViewerState = { id: string; page: number; total: number };

/** The document that the viewer shows, its id changes with every build, and the page it is at. */
export function viewerState(page: Page): Promise<ViewerState | null> {
  return page.evaluate(`(async () => { ${FIND} return { id, page: scroll.forDocument(id).getCurrentPage(), total: scroll.forDocument(id).getTotalPages() }; })()`) as Promise<ViewerState | null>;
}

/** Scrolls the viewer so that a page is at the top. */
export function showViewerPage(page: Page, pageNumber: number): Promise<void> {
  return page.evaluate(`(async () => { ${FIND} scroll.forDocument(id).scrollToPage({ pageNumber: ${pageNumber}, behavior: "instant", alignY: 0 }); })()`) as Promise<void>;
}

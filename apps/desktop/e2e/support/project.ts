import type { Page } from "@playwright/test";
import type { Lang } from "./launch";

const NAMES = {
  "en-US": { create: "New project", close: "Close project", open: "Open project", recent: "Recent projects" },
  "zh-TW": { create: "新增專案", close: "關閉專案", open: "開啟專案", recent: "最近的專案" },
} as const;

/** Creates a project from the welcome screen, the file dialog answers with the file of the launch. */
export async function createProject(page: Page, lang: Lang = "en-US"): Promise<void> {
  await page.getByRole("button", { name: NAMES[lang].create }).click();
}

/** Closes the project that is open, back to the welcome screen. */
export async function closeProject(page: Page, lang: Lang = "en-US"): Promise<void> {
  await page.getByRole("button", { name: NAMES[lang].close }).click();
}

/** Opens the project of the launch again, through the open dialog. */
export async function openProject(page: Page, lang: Lang = "en-US"): Promise<void> {
  await page.getByRole("button", { name: NAMES[lang].open }).click();
}

/** Opens the first of the recent projects. */
export async function openRecent(page: Page, lang: Lang = "en-US"): Promise<void> {
  await page.getByRole("region", { name: NAMES[lang].recent }).getByRole("button").first().click();
}

/** Writes the Markdown of the first chapter, straight into the project and not through the editor. */
export async function seedChapter(page: Page, text: string): Promise<void> {
  await page.evaluate(async (markdown) => {
    const list = await window.marktwain.invoke("document:list");
    if (!list.ok) return;
    const chapter = list.data.find((d) => d.kind === "chapter")!;
    await window.marktwain.invoke("document:save", { id: chapter.id, text: markdown });
  }, text);
}

/** The Markdown that the project holds for the first chapter, empty when there is none. */
export function readChapter(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const list = await window.marktwain.invoke("document:list");
    if (!list.ok) return "";
    const chapter = list.data.find((d) => d.kind === "chapter");
    const doc = chapter && (await window.marktwain.invoke("document:get", { id: chapter.id }));
    return doc && doc.ok ? doc.data.text : "";
  });
}

/** Seeds the chapter, then closes and reopens the project, so the editor shows what was written. */
export async function reopenWithChapter(page: Page, text: string, lang: Lang = "en-US"): Promise<void> {
  await seedChapter(page, text);
  await closeProject(page, lang);
  await openRecent(page, lang);
}

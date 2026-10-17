import { expect, type Page } from "@playwright/test";
import type { Lang } from "./launch";

const NAMES = {
  "en-US": { create: "New project", confirm: "Create project", close: "Close project", open: "Open project", recent: "Recent projects", engines: { typst: "Typst", latex: "LaTeX" } },
  "zh-TW": { create: "新增專案", confirm: "建立專案", close: "關閉專案", open: "開啟專案", recent: "最近的專案", engines: { typst: "Typst", latex: "LaTeX" } },
} as const;

/** Answers the question about the output of a new project, Typst unless another is named. */
export async function chooseEngine(page: Page, engine: "typst" | "latex" = "typst", lang: Lang = "en-US"): Promise<void> {
  const dialog = page.getByTestId("engine-dialog");
  if (engine !== "typst") await dialog.getByRole("radio", { name: new RegExp(NAMES[lang].engines[engine]) }).check();
  await dialog.getByRole("button", { name: NAMES[lang].confirm }).click();
}

/** Creates a project from the welcome screen, the file dialog answers with the file of the launch. */
export async function createProject(page: Page, lang: Lang = "en-US", engine: "typst" | "latex" = "typst"): Promise<void> {
  await page.getByRole("button", { name: NAMES[lang].create }).click();
  await chooseEngine(page, engine, lang);
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
    if (!list.ok) throw new Error("an IPC call that the test needs failed");
    const chapter = list.data.find((d) => d.kind === "chapter")!;
    await window.marktwain.invoke("document:save", { id: chapter.id, text: markdown });
  }, text);
}

/** The Markdown that the project holds for the first chapter, empty when there is none. */
export function readChapter(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const list = await window.marktwain.invoke("document:list");
    if (!list.ok) throw new Error("an IPC call that the test needs failed");
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

/**
 * The Markdown of the first chapter after everything that was typed is saved: it saves at once, as Ctrl or Cmd with S does,
 * then reads until two reads agree, since the status line may still say Saved for a change that is on its way.
 */
export async function savedChapter(page: Page): Promise<string> {
  await page.keyboard.press("ControlOrMeta+s");
  let previous = await readChapter(page);
  for (let round = 0; round < 20; round += 1) {
    await page.waitForTimeout(300);
    const current = await readChapter(page);
    if (current === previous) return current;
    previous = current;
  }
  return previous;
}

/** The marks of what changed since the last version are off until they are asked for, this turns them on in the settings. */
export async function showChangeMarks(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Writing" }).click();
  const marks = dialog.getByRole("switch", { name: "Mark changes since the last version" });
  if ((await marks.getAttribute("aria-checked")) !== "true") await marks.click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

import { expect, test } from "../../support/test";
import { createProject, savedChapter } from "../../support/project";

test("a link is made from the selected text, opens its address on a click, and is edited and removed", async ({ launch }) => {
  const { app } = await launch({ name: "links" });
  const page = await app.firstWindow();
  await createProject(page);
  // The browser is not started, what the main process is asked to open is kept
  await app.evaluate(({ shell }) => {
    const opened: string[] = [];
    (globalThis as unknown as { __opened: string[] }).__opened = opened;
    shell.openExternal = async (url: string) => void opened.push(url);
  });
  const opened = () => app.evaluate(() => (globalThis as unknown as { __opened: string[] }).__opened);
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.type("see docs here");

  // The words are selected and the key of the link asks for its address, the selection is the text of the link
  await page.evaluate(() => {
    const text = document.querySelector(".ProseMirror p")!.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 4);
    range.setEnd(text, 8);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toBe("docs");
  // The editor has taken the selection when the tools for text show
  await expect(page.getByLabel("Selection tools")).toBeVisible();
  await page.keyboard.press("ControlOrMeta+k");
  const dialog = page.getByRole("dialog", { name: "Insert link" });
  await expect(dialog.getByLabel("Text")).toHaveValue("docs");
  await dialog.getByLabel("Address").fill("example.com/docs");
  await dialog.getByRole("button", { name: "Insert" }).click();
  await expect(dialog).toBeHidden();
  const link = editor.locator("a");
  await expect(link).toHaveText("docs");
  await expect(link).toHaveAttribute("href", "https://example.com/docs");
  expect(await savedChapter(page)).toContain("see [docs](https://example.com/docs) here");

  // A link is underlined and on hover its color fills it, with square corners
  const style = () => link.evaluate((el) => {
    const css = getComputedStyle(el);
    return { line: css.textDecorationLine, radius: css.borderTopLeftRadius, size: css.backgroundSize };
  });
  expect(await style()).toEqual({ line: "underline", radius: "0px", size: "0% 100%" });
  await link.hover();
  await expect.poll(async () => (await style()).size).toBe("100% 100%");

  // A click goes to the address, and the caret in the link shows the tools of the link
  await link.click();
  await expect.poll(opened).toEqual(["https://example.com/docs"]);
  const tools = page.getByLabel("Link tools");
  await expect(tools).toBeVisible();
  await expect(tools).toContainText("https://example.com/docs");

  // The address is changed, the text of the link too
  await tools.getByRole("button", { name: "Edit link" }).click();
  const edit = page.getByRole("dialog", { name: "Edit link" });
  await expect(edit.getByLabel("Text")).toHaveValue("docs");
  await edit.getByLabel("Text").fill("the docs");
  await edit.getByLabel("Address").fill("https://example.org");
  await edit.getByRole("button", { name: "Update" }).click();
  await expect(link).toHaveText("the docs");
  expect(await savedChapter(page)).toContain("see [the docs](https://example.org) here");

  // The link goes and its words stay
  await link.click();
  await page.getByLabel("Link tools").getByRole("button", { name: "Remove link" }).click();
  await expect(editor.locator("a")).toHaveCount(0);
  expect(await savedChapter(page)).toBe("see the docs here\n");
});

test("an address that could run something is refused, and a link can be made without selected text", async ({ launch }) => {
  const { app } = await launch({ name: "links2" });
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.type("go ");
  await page.keyboard.press("ControlOrMeta+k");
  const dialog = page.getByRole("dialog", { name: "Insert link" });
  await dialog.getByLabel("Address").fill("javascript:alert(1)");
  await expect(dialog.getByRole("alert")).toContainText("not a usable address");
  await expect(dialog.getByRole("button", { name: "Insert" })).toBeDisabled();
  // With no text the address is the text
  await dialog.getByLabel("Address").fill("example.com");
  await dialog.getByRole("button", { name: "Insert" }).click();
  await expect(editor.locator("a")).toHaveText("https://example.com");
  // What is typed next is not part of the link
  await page.keyboard.type(" and more");
  expect(await savedChapter(page)).toBe("go [https://example.com](https://example.com) and more\n");
});

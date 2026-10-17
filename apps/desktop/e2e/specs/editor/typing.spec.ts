import { expect, test } from "../../support/test";
import { closeProject, createProject, savedChapter } from "../../support/project";

test("typing in the editor is saved as Markdown and survives a reopen", async ({ launch }) => {
  const { app, file } = await launch({ name: "編輯", lang: "zh-TW", projectName: "論文.marktwain" });
  const page = await app.firstWindow();
  await createProject(page, "zh-TW");

  const editor = page.locator(".ProseMirror");
  await expect(editor).toBeVisible();
  await editor.click();
  // Markdown input rules, "# " becomes a heading and text wrapped in ** becomes bold
  await page.keyboard.type("# 緒論");
  await page.keyboard.press("Enter");
  await page.keyboard.type("這是**重點**內文。");
  await expect(page.getByRole("status")).toHaveText("已儲存");
  await expect(editor.locator("h1")).toHaveText("緒論");
  await expect(editor.locator("strong")).toHaveText("重點");

  // Switch to the abstract and back, the content is kept because switching saves first
  const sidebar = page.getByRole("complementary", { name: "文件" });
  await sidebar.getByRole("button", { name: "中文摘要", exact: true }).click();
  await expect(page.locator(".ProseMirror h1")).toHaveCount(0);
  await sidebar.getByRole("button", { name: "第 1 章", exact: true }).click();
  await expect(page.locator(".ProseMirror h1")).toHaveText("緒論");

  // Close and reopen the project, Markdown is read back from SQLite
  await closeProject(page, "zh-TW");
  await page.getByRole("button", { name: "開啟專案" }).click();
  await expect(page.locator(".ProseMirror h1")).toHaveText("緒論");
  await expect(page.locator(".ProseMirror strong")).toHaveText("重點");

  // The file stores Markdown, not JSON
  const text = await savedChapter(page);
  expect(text).toBe("# 緒論\n\n這是**重點**內文。\n");
});


test("pasting Markdown text becomes document structure; Ctrl+S saves at once", async ({ launch }) => {
  const { app, file } = await launch({ name: "貼上", projectName: "論文.marktwain" });
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  await editor.click();

  await page.evaluate(() => {
    const data = new DataTransfer();
    data.setData("text/plain", "# 貼上的標題\n\n- 一\n- 二\n\n含 **粗體** 與 $x^2$。\n");
    document
      .querySelector(".ProseMirror")!
      .dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await expect(editor.locator("h1")).toHaveText("貼上的標題");
  await expect(editor.locator("ul li")).toHaveCount(2);
  await expect(editor.locator("strong")).toHaveText("粗體");
  await expect(editor.locator("[data-type='inline-math']")).toHaveCount(1);

  await page.keyboard.press("ControlOrMeta+s");
  await expect(page.getByRole("status")).toHaveText("Saved");
});


test("Ctrl or Cmd with B makes text bold, and the sidebar folds with a backslash", async ({ launch }) => {
  const { app } = await launch({ name: "快捷鍵" });
  const page = await app.firstWindow();
  await createProject(page);
  const sidebar = page.getByRole("complementary", { name: "Documents" });
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.type("bold words");
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("ControlOrMeta+b");
  await expect(editor.locator("strong")).toHaveText("bold words");
  await expect(sidebar).toHaveAttribute("data-collapsed", "false");

  await page.keyboard.press("ControlOrMeta+\\");
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");
  await page.keyboard.press("ControlOrMeta+\\");
  await expect(sidebar).toHaveAttribute("data-collapsed", "false");

  // Every visual line has a number, a wrapped paragraph gets several
  await editor.click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("long ".repeat(200));
  const numbers = page.getByTestId("line-gutter").locator("[data-line]");
  await expect.poll(() => numbers.count()).toBeGreaterThan(4);
  const first = await numbers.first().boundingBox();
  const text = await editor.boundingBox();
  expect(first && text && first.x + first.width <= text.x).toBe(true);

  // With the preview open the editor is narrower, the numbers stay next to the text and inside the editor
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByTestId("preview-pages")).toBeVisible();
  await expect.poll(async () => {
    const number = await numbers.first().boundingBox();
    const box = await editor.boundingBox();
    const aside = await sidebar.boundingBox();
    return !!(number && box && aside && number.x >= aside.x + aside.width && number.x + number.width <= box.x + 1);
  }).toBe(true);
  await expect.poll(() => numbers.count()).toBeGreaterThan(4);
});

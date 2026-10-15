import { expect, test } from "../../support/test";
import { PNG_1X1, makePng } from "../../support/png";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { closeProject, createProject, savedChapter } from "../../support/project";

test("an image is stored in the project, shown in the editor, and saved as Markdown", async ({ launch }) => {
  const { app, dir, file } = await launch({ name: "圖片", projectName: "論文.marktwain", env: (folder) => ({ MARKTWAIN_TEST_IMAGE_PATH: join(folder, "我的 圖.png") }) });
  const image = join(dir, "我的 圖.png");
  writeFileSync(image, PNG_1X1);
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  await editor.click();
  const dialog = page.getByRole("dialog");

  await page.getByRole("button", { name: "Insert image" }).click();
  await dialog.getByLabel("Caption").fill("Sample");
  await dialog.getByRole("combobox", { name: "Width" }).click();
  await page.getByRole("option", { name: "60%" }).click();
  await dialog.getByRole("button", { name: "Insert" }).click();
  await expect(dialog).toBeHidden();

  // The image loads from the project file through the custom protocol
  const img = editor.locator("figure img");
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(1);
  await expect(editor.locator("figcaption")).toHaveText("Sample");
  await expect(page.getByRole("status")).toHaveText("Saved");

  // The image is still there after reopening the project
  await closeProject(page);
  await page.getByRole("button", { name: "Open project" }).click();
  await expect.poll(() => editor.locator("figure img").evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(1);

  const text = await savedChapter(page);
  expect(text).toMatch(/!\[Sample\]\(images\/[0-9a-f]{16}\.png\)\{[^}]*width=60%[^}]*\}/);
});


test("a picture is resized by its corners and cropped, in the manner of Word", async ({ launch }) => {
  const { app, dir } = await launch({ name: "圖片編輯", projectName: "論文.marktwain", env: (folder) => ({ MARKTWAIN_TEST_IMAGE_PATH: join(folder, "照片.png") }) });
  const image = join(dir, "照片.png");
  writeFileSync(image, makePng(200, 100));
  const page = await app.firstWindow();
  await createProject(page);
  const editor = page.locator(".ProseMirror");
  await editor.click();
  const dialog = page.getByRole("dialog");
  await page.getByRole("button", { name: "Insert image" }).click();
  await dialog.getByLabel("Caption").fill("Photo");
  await dialog.getByRole("button", { name: "Insert" }).click();
  await expect(dialog).toBeHidden();

  // A click selects the picture, handles and a floating menu appear
  const figure = editor.locator("figure");
  await figure.locator("img").click();
  await expect(figure).toHaveClass(/is-selected/);
  await expect(page.getByLabel("Picture tools")).toBeVisible();

  // Preset widths from the menu
  await page.getByRole("button", { name: "Width 50%" }).click();
  await expect(figure).toHaveAttribute("data-width", "50%");

  // Dragging a corner resizes it and shows the width on the way
  const handle = figure.locator("[data-handle='se']");
  const hbox = (await handle.boundingBox())!;
  await page.mouse.move(hbox.x + hbox.width / 2, hbox.y + hbox.height / 2);
  await page.mouse.down();
  await page.mouse.move(hbox.x + 120, hbox.y + 10, { steps: 6 });
  await expect(page.getByTestId("figure-value")).toContainText(/Width \d+%/);
  await page.mouse.up();
  const width = Number(((await figure.getAttribute("data-width")) ?? "").replace("%", ""));
  expect(width).toBeGreaterThan(50);

  // Crop to the left half, the picture is replaced by a new one that is half as wide
  await figure.locator("img").click();
  await page.getByRole("button", { name: "Crop", exact: true }).click();
  const stage = page.getByTestId("crop-stage");
  await expect(stage).toBeVisible();
  const corner = page.locator("[data-corner='se']");
  const cbox = (await corner.boundingBox())!;
  const sbox = (await stage.boundingBox())!;
  await page.mouse.move(cbox.x + cbox.width / 2, cbox.y + cbox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sbox.x + sbox.width / 2, cbox.y + cbox.height / 2, { steps: 6 });
  await page.mouse.up();
  const before = await figure.locator("img").getAttribute("src");
  await page.getByRole("dialog").getByRole("button", { name: "Crop", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect.poll(() => figure.locator("img").getAttribute("src")).not.toBe(before);
  await expect.poll(() => figure.locator("img").evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(80);
  const natural = await figure.locator("img").evaluate((el: HTMLImageElement) => [el.naturalWidth, el.naturalHeight]);
  expect(natural[0]).toBeLessThan(120);
  expect(natural[1]).toBe(100);
});

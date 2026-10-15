import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");

test("the handle at the corner of a table selects every cell and drags the table to another place", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 把手 "));
  const args = [`--user-data-dir=${join(dir, "userData")}`, "--lang=en-US"];
  if (process.platform === "linux") args.push("--no-sandbox");
  const app = await electron.launch({
    executablePath: findPackagedExecutable(dist),
    args,
    env: { ...process.env, MARKTWAIN_TEST_DIALOG_PATH: join(dir, "p.marktwain"), MARKTWAIN_TEST_NO_PROFILE_DIALOG: "1" },
  });
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: "New project" }).click();
    await page.evaluate(async () => {
      const list = await window.marktwain.invoke("document:list");
      if (!list.ok) return;
      const chapter = list.data.find((d) => d.kind === "chapter")!;
      await window.marktwain.invoke("document:save", {
        id: chapter.id,
        text: ["# One", "", "Before the table.", "", "| a | b |", "|---|---|", "| 1 | 2 |", "| 3 | 4 |", "", ": A table {#tbl:t}", "", "After the table.", "", "The last paragraph."].join("\n"),
      });
    });
    await page.getByRole("button", { name: "Close project" }).click();
    await page.getByRole("region", { name: "Recent projects" }).getByRole("button").first().click();

    const editor = page.locator(".ProseMirror");
    const handle = page.getByTestId("table-handle");
    await expect(handle).toHaveCount(0);
    await editor.locator("td").first().hover();
    await expect(handle).toBeVisible();

    // One click selects all of the cells, and the table tools are there
    await handle.click();
    await expect(editor.locator(".selectedCell")).toHaveCount(6);
    await expect(page.getByRole("toolbar", { name: /table/i })).toBeVisible();

    // The handle stays while the table is selected, and goes when the pointer is away from a table that is not
    await editor.getByText("The last paragraph.").click();
    await expect(handle).toHaveCount(0);

    // Dragging it moves the whole table down past a paragraph
    await editor.locator("td").first().hover();
    await expect(handle).toBeVisible();
    const grip = (await handle.boundingBox())!;
    const target = (await editor.getByText("The last paragraph.").boundingBox())!;
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(grip.x + grip.width / 2, grip.y + 30, { steps: 5 });
    await page.mouse.move(target.x + 40, target.y + 20, { steps: 10 });
    await page.mouse.up();
    const order = () =>
      editor.evaluate((root) => [...root.children].filter((c) => c.tagName === "P" || c.classList.contains("tableWrapper")).map((c) => (c.tagName === "P" ? (c.textContent ?? "") : "TABLE")));
    await expect.poll(async () => (await order()).indexOf("TABLE") > (await order()).indexOf("After the table.")).toBe(true);
    expect((await order()).filter((item) => item === "TABLE")).toHaveLength(1);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a table that is selected as a whole is given another template and keeps its caption, label and size", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 換範本 "));
  const args = [`--user-data-dir=${join(dir, "userData")}`, "--lang=en-US"];
  if (process.platform === "linux") args.push("--no-sandbox");
  const app = await electron.launch({
    executablePath: findPackagedExecutable(dist),
    args,
    env: { ...process.env, MARKTWAIN_TEST_DIALOG_PATH: join(dir, "p.marktwain"), MARKTWAIN_TEST_NO_PROFILE_DIALOG: "1" },
  });
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: "New project" }).click();
    await page.evaluate(async () => {
      const list = await window.marktwain.invoke("document:list");
      if (!list.ok) return;
      const chapter = list.data.find((d) => d.kind === "chapter")!;
      await window.marktwain.invoke("document:save", {
        id: chapter.id,
        text: ["# One", "", "| a | b |", "|---|---|", "| 1 | 2 |", "", ": My own caption {#tbl:mine width=80%}"].join("\n"),
      });
    });
    await page.getByRole("button", { name: "Close project" }).click();
    await page.getByRole("region", { name: "Recent projects" }).getByRole("button").first().click();

    const editor = page.locator(".ProseMirror");
    await editor.locator("td").first().hover();
    await page.getByTestId("table-handle").click();
    await page.getByRole("menuitem", { name: "Change template" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("tab", { name: "By size" })).toHaveCount(0);
    await dialog.getByTestId("template-picker").getByRole("button", { name: "Confusion matrix" }).click();
    await dialog.getByRole("button", { name: "Apply" }).click();
    await expect(dialog).toBeHidden();

    // The cells are the template's, the caption, the label and the width are the old ones
    await expect(editor.locator("table")).toHaveCount(1);
    await expect(editor.locator("td, th").filter({ hasText: "Predicted" }).first()).toBeVisible();
    await expect(editor.locator(".table-caption")).toContainText("My own caption");
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const list = await window.marktwain.invoke("document:list");
          if (!list.ok) return "";
          const chapter = list.data.find((d) => d.kind === "chapter")!;
          const doc = await window.marktwain.invoke("document:get", { id: chapter.id });
          return doc.ok ? doc.data.text : "";
        }),
      )
      .toMatch(/: My own caption \{#tbl:mine[^}]*width=80%/);

    // Undo brings the old table back
    await page.keyboard.press("ControlOrMeta+z");
    await expect(editor.locator("td").first()).toHaveText("1");
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

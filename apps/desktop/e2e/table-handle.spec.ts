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

    // The handle goes when the pointer is away from the table
    await editor.getByText("The last paragraph.").hover();
    await expect(handle).toHaveCount(0);

    // Dragging it moves the whole table down past a paragraph
    await editor.locator("td").first().hover();
    await expect(handle).toBeVisible();
    await handle.dragTo(editor.getByText("The last paragraph."), { targetPosition: { x: 40, y: 20 } });
    const order = await editor.evaluate((root) => [...root.children].filter((c) => c.tagName === "P" || c.classList.contains("tableWrapper") || c.tagName === "TABLE" || c.tagName === "FIGURE").map((c) => (c.tagName === "P" ? (c.textContent ?? "") : "TABLE")));
    expect(order.indexOf("TABLE")).toBeGreaterThan(order.indexOf("After the table."));
    expect(order.filter((item) => item === "TABLE")).toHaveLength(1);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

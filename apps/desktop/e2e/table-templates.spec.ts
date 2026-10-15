import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");

test("a table is made from a template chosen by field, with its size, and it is a normal table that can be edited", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 範本 "));
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
    await page.locator(".ProseMirror").click();
    await page.getByRole("button", { name: "Insert table" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("tab", { name: "Templates" }).click();

    // The library is grouped by field and can be searched
    const picker = dialog.getByTestId("template-picker");
    await expect(picker.getByRole("tab", { name: "Economics and finance" })).toBeVisible();
    await picker.getByRole("tab", { name: "Economics and finance" }).click();
    await expect(picker.getByRole("list", { name: "Templates" }).getByRole("button")).toHaveCount(2);
    await picker.getByRole("tab", { name: "All" }).click();
    await picker.getByLabel("Search the templates").fill("regression");
    await expect(picker.getByRole("list", { name: "Templates" }).getByRole("button")).toHaveCount(1);
    await picker.getByLabel("Search the templates").fill("");

    // A template with a size, the drawing follows it and keeps the merged cells
    await picker.getByRole("button", { name: "Payoff matrix" }).click();
    await expect(picker.getByTestId("table-preview")).toContainText("Player 2");
    await expect(picker.getByTestId("table-preview").locator("td[colspan='2'][rowspan='2']")).toHaveCount(1);
    await picker.getByLabel("Strategies of the row player").fill("3");
    await expect(picker.getByTestId("table-preview").locator("tr")).toHaveCount(5);
    await dialog.getByRole("button", { name: "Insert" }).click();

    // A normal table with its caption and merged cells, saved as the usual Markdown
    const editor = page.locator(".ProseMirror");
    await expect(editor.locator("table")).toHaveCount(1);
    await expect(editor.locator("table tr")).toHaveCount(5);
    await expect(editor.locator("td[colspan='2'], th[colspan='2']").first()).toBeVisible();
    await expect(editor.locator(".table-caption")).toContainText("Payoff matrix");
    await editor.locator("td").nth(8).click();
    await page.keyboard.type("3, 1");
    const read = () =>
      page.evaluate(async () => {
        const list = await window.marktwain.invoke("document:list");
        if (!list.ok) return "";
        const chapter = list.data.find((d) => d.kind === "chapter")!;
        const doc = await window.marktwain.invoke("document:get", { id: chapter.id });
        return doc.ok ? doc.data.text : "";
      });
    await expect.poll(read).toContain(": Payoff matrix");
    const text = await read();
    expect(text).toContain("style=grid");
    expect(text).toContain("colspan=2");
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

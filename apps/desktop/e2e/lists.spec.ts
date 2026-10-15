import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");

test("the markers of list levels are chosen in the settings and shown in the editor, and the Markdown does not change", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 清單 "));
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
    const text = "# Intro\n\n1. First\n   1. Inner\n      - Dot\n2. Second\n\n- Plain\n  - Deeper\n";
    await page.evaluate(async (t) => {
      const list = await window.marktwain.invoke("document:list");
      if (!list.ok) return;
      const chapter = list.data.find((d) => d.kind === "chapter")!;
      await window.marktwain.invoke("document:save", { id: chapter.id, text: t });
    }, text);
    await page.getByRole("button", { name: "Close project" }).click();
    await page.getByRole("region", { name: "Recent projects" }).getByRole("button").first().click();
    const editor = page.locator(".ProseMirror");
    await expect(editor.locator(":scope > ol > li")).toHaveCount(2);
    // Nothing is chosen, so the editor keeps its own markers
    await expect(editor.locator("li[data-marker]")).toHaveCount(0);

    await page.keyboard.press("ControlOrMeta+,");
    const dialog = page.getByRole("dialog", { name: "Settings" });
    await dialog.getByRole("button", { name: "Lists", exact: true }).click();
    await dialog.getByRole("combobox", { name: "Combination" }).click();
    await page.getByRole("option", { name: "Chinese thesis" }).click();

    // The preview in the settings and the editor show 一、 then (一) then 1.
    await expect(dialog.getByTestId("list-preview-ordered").locator("li").first()).toContainText("一、");
    await expect(dialog.getByTestId("list-preview-ordered").locator("li").nth(1)).toContainText("(一)");
    await page.keyboard.press("Escape");
    await expect(editor.locator(":scope > ol > li").first()).toHaveAttribute("data-marker", "一、");
    await expect(editor.locator(":scope > ol > li").nth(1)).toHaveAttribute("data-marker", "二、");
    await expect(editor.locator("ol ol > li").first()).toHaveAttribute("data-marker", "(一)");
    await expect(editor.locator(":scope > ul > li").first()).toHaveAttribute("data-marker", "•");
    await expect(editor.locator("ul ul > li").first()).toHaveAttribute("data-marker", "○");

    // A level of its own, the third level of the numbered lists becomes circled digits
    await page.keyboard.press("ControlOrMeta+,");
    await dialog.getByRole("combobox", { name: "Numbered lists Level 3" }).click();
    await page.getByRole("option", { name: /Circled numbers/ }).click();
    await expect(dialog.getByRole("combobox", { name: "Combination" })).toContainText("Custom");
    await page.keyboard.press("Escape");

    // The document itself is the same Markdown
    const saved = await page.evaluate(async () => {
      const list = await window.marktwain.invoke("document:list");
      if (!list.ok) return "";
      const chapter = list.data.find((d) => d.kind === "chapter")!;
      const doc = await window.marktwain.invoke("document:get", { id: chapter.id });
      return doc.ok ? doc.data.text : "";
    });
    expect(saved).toContain("1. First");
    expect(saved).not.toContain("一");
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

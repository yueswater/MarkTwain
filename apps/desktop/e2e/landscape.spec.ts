import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");

test("a landscape block is inserted from the slash menu and the shortcut, framed, saved and taken away again", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 橫向 "));
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
    const editor = page.locator(".ProseMirror");
    await editor.click();

    await page.keyboard.type("/landscape");
    await page.keyboard.press("Enter");
    await page.keyboard.type("A wide table goes here");
    const block = editor.locator("div[data-landscape]");
    await expect(block).toHaveCount(1);
    await expect(block.locator(".landscape-head")).toContainText("Landscape");

    // The document keeps it as a fenced block of the class
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
      .toContain("::: {.landscape}");

    // The button of the head takes the frame away and keeps the text
    await block.locator(".landscape-head button").dispatchEvent("mousedown");
    await expect(editor.locator("div[data-landscape]")).toHaveCount(0);
    await expect(editor).toContainText("A wide table goes here");

    // The shortcut wraps the paragraph again
    await page.keyboard.press("ControlOrMeta+Alt+L");
    await expect(editor.locator("div[data-landscape]")).toHaveCount(1);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

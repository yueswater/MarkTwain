import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");

test("a table in the editor has the width, columns, lines and caption of the one in the PDF", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 表格 "));
  const args = [`--user-data-dir=${join(dir, "userData")}`, "--lang=zh-TW"];
  if (process.platform === "linux") args.push("--no-sandbox");
  const app = await electron.launch({
    executablePath: findPackagedExecutable(dist),
    args,
    env: { ...process.env, MARKTWAIN_TEST_DIALOG_PATH: join(dir, "p.marktwain"), MARKTWAIN_TEST_NO_PROFILE_DIALOG: "1" },
  });
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: "新增專案" }).click();
    await page.evaluate(async () => {
      const list = await window.marktwain.invoke("document:list");
      if (!list.ok) return;
      const chapter = list.data.find((d) => d.kind === "chapter")!;
      await window.marktwain.invoke("document:save", {
        id: chapter.id,
        text: [
          "# 表",
          "",
          "| 變數 | 平均 | 標準差 |",
          "|:--|--:|--:|",
          "| 年齡 | 21.5 | 3.2 |",
          "| 身高 | 165.2 | 8.1 |",
          "",
          ": 三線表 {#tbl:a notes=\"資料來源：自行整理\" widths=\"20%,30%,50%\"}",
          "",
          "| 甲 | 乙 | 丙 |",
          "|---|---|---|",
          "| 1 | 2 | 3 |",
          "",
          ": 全框線 {#tbl:b style=grid}",
        ].join("\n"),
      });
    });
    await page.getByRole("button", { name: "關閉專案" }).click();
    await page.getByRole("region", { name: "最近的專案" }).getByRole("button").first().click();
    const editor = page.locator(".ProseMirror");
    await expect(editor.locator("table")).toHaveCount(2);

    // The table is as wide as the text and its columns keep the shares of the widths, nothing runs past the edge
    const first = editor.locator("table").first();
    const shares = await first.evaluate((table) => {
      const total = table.getBoundingClientRect().width;
      const wrapper = table.closest(".tableWrapper") as HTMLElement;
      const cells = [...table.querySelectorAll("tr:first-child > th, tr:first-child > td")].map((cell) => cell.getBoundingClientRect().width / total);
      return { cells, fill: total / wrapper.clientWidth, overflow: wrapper.scrollWidth - wrapper.clientWidth };
    });
    expect(shares.cells[0]).toBeCloseTo(0.2, 1);
    expect(shares.cells[1]).toBeCloseTo(0.3, 1);
    expect(shares.cells[2]).toBeCloseTo(0.5, 1);
    expect(shares.fill).toBeCloseTo(1, 2);
    expect(shares.overflow).toBeLessThanOrEqual(1);

    // Three-line has a heavy line above and below, a light one under the header and nothing at the sides, and the header is plain
    const head = editor.locator("th").first();
    await expect(head).toHaveCSS("border-top-style", "solid");
    await expect(head).toHaveCSS("border-left-style", "none");
    await expect(head).toHaveCSS("font-weight", "400");
    // A screen rounds the widths of lines, so the widths that were asked for are read from the cell: 1 pt above and 0.6 pt under the header
    const style = (await head.getAttribute("style")) ?? "";
    const widthOf = (side: string) => Number.parseFloat(new RegExp(`border-${side}: ([\\d.]+)px`).exec(style)?.[1] ?? "0");
    expect(widthOf("top")).toBeGreaterThan(widthOf("bottom"));
    expect(widthOf("bottom")).toBeGreaterThan(0);
    await expect(editor.locator("td").first()).toHaveCSS("border-bottom-style", "none");
    // A grid has every line
    const cell = editor.locator("table").nth(1).locator("td").first();
    await expect(cell).toHaveCSS("border-left-style", "solid");
    await expect(cell).toHaveCSS("border-right-style", "solid");

    // The caption has the number and sits under the table as in the PDF, the notes come before it
    await expect(editor.locator(".table-caption").first()).toHaveText("表 1　三線表");
    await expect(editor.locator(".table-caption").nth(1)).toHaveText("表 2　全框線");
    await expect(editor.locator(".table-notes")).toHaveText("註：資料來源：自行整理");
    const order = await page.evaluate(() => {
      const table = document.querySelector(".ProseMirror .tableWrapper") as HTMLElement;
      const notes = document.querySelector(".ProseMirror .table-notes") as HTMLElement;
      const caption = document.querySelector(".ProseMirror .table-caption") as HTMLElement;
      return [table.getBoundingClientRect().bottom <= notes.getBoundingClientRect().top + 1, notes.getBoundingClientRect().bottom <= caption.getBoundingClientRect().top + 1];
    });
    expect(order).toEqual([true, true]);
    await expect(editor.locator(".table-caption").first()).toHaveCSS("width", /^[1-9]/);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a table can be made narrower and smaller, and the toolbar shows what it has", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 表寬 "));
  const args = [`--user-data-dir=${join(dir, "userData")}`, "--lang=zh-TW"];
  if (process.platform === "linux") args.push("--no-sandbox");
  const app = await electron.launch({
    executablePath: findPackagedExecutable(dist),
    args,
    env: { ...process.env, MARKTWAIN_TEST_DIALOG_PATH: join(dir, "p.marktwain"), MARKTWAIN_TEST_NO_PROFILE_DIALOG: "1" },
  });
  try {
    const page = await app.firstWindow();
    await page.getByRole("button", { name: "新增專案" }).click();
    await page.evaluate(async () => {
      const list = await window.marktwain.invoke("document:list");
      if (!list.ok) return;
      const chapter = list.data.find((d) => d.kind === "chapter")!;
      await window.marktwain.invoke("document:save", {
        id: chapter.id,
        text: ["# 表", "", "| 甲 | 乙 |", "|---|---|", "| 1 | 2 |", "", ": 小表 {#tbl:w width=50% size=80%}"].join("\n"),
      });
    });
    await page.getByRole("button", { name: "關閉專案" }).click();
    await page.getByRole("region", { name: "最近的專案" }).getByRole("button").first().click();
    const editor = page.locator(".ProseMirror");
    const wrapper = editor.locator(".tableWrapper").first();
    const ratio = async () =>
      wrapper.evaluate((el) => ({ width: el.getBoundingClientRect().width / (el.parentElement as HTMLElement).clientWidth, size: Number.parseFloat(getComputedStyle(el).fontSize) }));
    const before = await ratio();
    expect(before.width).toBeCloseTo(0.5, 1);

    // The toolbar reads the values and a new one is written into the document
    await editor.locator("td").first().click();
    const width = page.getByRole("textbox", { name: "表寬" });
    await expect(width).toHaveValue("50");
    await expect(page.getByRole("textbox", { name: "字級" })).toHaveValue("80");
    await width.fill("80");
    await width.press("Enter");
    await expect.poll(async () => (await ratio()).width).toBeCloseTo(0.8, 1);
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
      .toContain("width=80%");

    // A blank value goes back to the full width
    await page.getByRole("textbox", { name: "表寬" }).fill("");
    await page.getByRole("textbox", { name: "表寬" }).press("Enter");
    await expect.poll(async () => (await ratio()).width).toBeCloseTo(1, 1);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

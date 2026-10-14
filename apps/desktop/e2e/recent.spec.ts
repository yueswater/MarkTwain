import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findPackagedExecutable } from "./find-app";

const dist = resolve(__dirname, "../dist");

test("the app remembers recent projects and reopens the last one unless it was closed", async () => {
  const dir = mkdtempSync(join(tmpdir(), "marktwain 最近 "));
  const file = join(dir, "我的論文.marktwain");
  const args = [`--user-data-dir=${join(dir, "userData")}`, "--lang=zh-TW"];
  if (process.platform === "linux") args.push("--no-sandbox");
  const launch = () =>
    electron.launch({
      executablePath: findPackagedExecutable(dist),
      args,
      env: { ...process.env, MARKTWAIN_TEST_DIALOG_PATH: file },
    });
  const sidebar = (page: Awaited<ReturnType<typeof launch>>["firstWindow"] extends () => Promise<infer P> ? P : never) =>
    page.getByRole("complementary", { name: "文件" });

  try {
    // First session, create a project and quit with it open
    const first = await launch();
    const page1 = await first.firstWindow();
    await page1.getByRole("button", { name: "新增專案" }).click();
    await expect(sidebar(page1)).toBeVisible();
    await first.close();

    // Second session, the project opens by itself, closing it shows the projects page with the list
    const second = await launch();
    const page2 = await second.firstWindow();
    await expect(sidebar(page2)).toBeVisible();
    await page2.getByRole("button", { name: "關閉專案" }).click();
    const list = page2.getByRole("region", { name: "最近的專案" });
    await expect(list.getByText("我的論文", { exact: true })).toBeVisible();
    await second.close();

    // Third session, it was closed on purpose so it stays closed, but it is in the list
    const third = await launch();
    const page3 = await third.firstWindow();
    await expect(page3.getByRole("button", { name: "新增專案" })).toBeVisible();
    await expect(sidebar(page3)).toHaveCount(0);
    await page3.getByRole("button", { name: /我的論文/ }).first().click();
    await expect(sidebar(page3)).toBeVisible();
    await page3.getByRole("button", { name: "關閉專案" }).click();

    // Removing an entry only forgets it, the file stays
    await page3.getByRole("button", { name: /從清單移除/ }).click({ force: true });
    await expect(page3.getByRole("region", { name: "最近的專案" })).toHaveCount(0);
    await third.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

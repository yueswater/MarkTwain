import { expect, test } from "../../support/test";
import { closeProject, createProject } from "../../support/project";

test("the app remembers recent projects and reopens the last one unless it was closed", async ({ launch }) => {
  const first = await launch({ name: "最近", lang: "zh-TW", projectName: "我的論文.marktwain" });
  const sidebar = (page: Awaited<ReturnType<typeof first.app.firstWindow>>) => page.getByRole("complementary", { name: "文件" });

  // First session, create a project and quit with it open
  const page1 = await first.app.firstWindow();
  await createProject(page1, "zh-TW");
  await expect(sidebar(page1)).toBeVisible();

  // Second session, the project opens by itself, closing it shows the projects page with the list
  const second = await first.restart();
  const page2 = await second.app.firstWindow();
  await expect(sidebar(page2)).toBeVisible();
  await closeProject(page2, "zh-TW");
  const list = page2.getByRole("region", { name: "最近的專案" });
  await expect(list.getByText("我的論文", { exact: true })).toBeVisible();

  // Third session, it was closed on purpose so it stays closed, but it is in the list
  const third = await second.restart();
  const page3 = await third.app.firstWindow();
  await expect(page3.getByRole("button", { name: "新增專案" })).toBeVisible();
  await expect(sidebar(page3)).toHaveCount(0);
  await page3.getByRole("button", { name: /我的論文/ }).first().click();
  await expect(sidebar(page3)).toBeVisible();
  await closeProject(page3, "zh-TW");

  // Removing an entry only forgets it, the file stays
  await page3.getByRole("button", { name: /從清單移除/ }).click({ force: true });
  await expect(page3.getByRole("region", { name: "最近的專案" })).toHaveCount(0);
});

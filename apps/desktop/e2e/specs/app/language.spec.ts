import { expect, test } from "../../support/test";

test("switching the language takes effect at once and is remembered", async ({ launch }) => {
  const first = await launch({ name: "語言", lang: "zh-TW" });
  const page = await first.app.firstWindow();
  await expect(page.locator("main")).toContainText("離線撰寫你的論文。");

  await page.getByTestId("language-toggle").click();
  await expect(page.locator("main")).toContainText("Write your thesis, offline.");

  // Restart, the OS locale is still Traditional Chinese but the English chosen by the user is remembered
  const second = await first.restart();
  const page2 = await second.app.firstWindow();
  await expect(page2.locator("main")).toContainText("Write your thesis, offline.");
});

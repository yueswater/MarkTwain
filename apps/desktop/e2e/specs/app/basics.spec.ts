import { realpathSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "../../support/test";

test("the app is named MarkTwain without moving its data, the window has a smallest size, and the page language follows the interface", async ({ launch }) => {
  const session = await launch({ name: "基本", lang: "en-US" });
  const page = await session.app.firstWindow();

  // The name of the package is scoped, and that is what the menu of macOS showed
  expect(await session.app.evaluate(({ app }) => app.getName())).toBe("MarkTwain");
  // The folder of the data is the one that was asked for, a new name does not move it
  // The temporary folder of macOS is a link, so both are looked at after the link is followed
  expect(realpathSync(await session.app.evaluate(({ app }) => app.getPath("userData")))).toBe(realpathSync(join(session.dir, "userData")));
  expect(await session.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getMinimumSize())).toEqual([960, 600]);

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByTestId("language-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
});

import { realpathSync } from "node:fs";
import { join } from "node:path";
import { launchApp } from "../../support/launch";
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

test("a second MarkTwain on the same data goes away and the first one keeps working", async ({ launch }) => {
  const first = await launch({ name: "單一" });
  const page = await first.app.firstWindow();
  await expect(page.getByRole("button", { name: "New project" })).toBeVisible();

  // The second one has the same folder of user data, it asks the first to come forward and quits, so Playwright cannot attach to it
  await expect(launchApp({ dir: first.dir, name: "單一" })).rejects.toThrow();
  await expect(page.getByRole("button", { name: "New project" })).toBeVisible();
  expect(first.app.process().exitCode).toBeNull();
});

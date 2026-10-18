import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "../../support/test";
import { createProject } from "../../support/project";

const VIOLET = `name: "My Violet"
author: "Me"
mode: dark
colors:
  background: "#1b1030"
  foreground: "#efe6ff"
  primary: "#b388ff"
`;

/** The color that the page takes as its background, as the browser writes it. */
const backgroundOf = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const isDark = (page: Page) => page.evaluate(() => document.documentElement.classList.contains("dark"));

async function openThemes(page: Page) {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await dialog.getByRole("button", { name: "Color theme", exact: true }).click();
  return dialog;
}

test("a theme is chosen, kept for the next start, added from a file and removed again", async ({ launch }) => {
  const first = await launch({
    name: "主題",
    projectName: "論文.marktwain",
    env: (folder) => {
      mkdirSync(folder, { recursive: true });
      writeFileSync(join(folder, "violet.marktwain.colortheme"), VIOLET);
      return { MARKTWAIN_TEST_IMAGE_PATH: join(folder, "violet.marktwain.colortheme") };
    },
  });
  const page = await first.app.firstWindow();
  await createProject(page);
  const defaultBackground = await backgroundOf(page);
  expect(await isDark(page)).toBe(false);

  // The themes that come with the app, each with a picture, and the look of the app is the one in use
  let dialog = await openThemes(page);
  const radios = dialog.getByRole("radio");
  expect(await radios.count()).toBeGreaterThanOrEqual(22);
  await expect(dialog.getByRole("radio", { name: "MarkTwain", exact: true })).toBeChecked();
  expect(await dialog.locator('[data-theme-id="nord"] img').count()).toBe(1);

  // A theme changes the colors at once, and the dark ones turn the dark mode of the page on
  await dialog.getByRole("radio", { name: "Nord", exact: true }).click();
  await expect(dialog.getByRole("radio", { name: "Nord", exact: true })).toBeChecked();
  await expect.poll(() => backgroundOf(page)).toBe("rgb(46, 52, 64)");
  expect(await isDark(page)).toBe(true);
  await dialog.getByRole("radio", { name: "GitHub", exact: true }).click();
  await expect.poll(() => backgroundOf(page)).toBe("rgb(255, 255, 255)");
  expect(await isDark(page)).toBe(false);
  await dialog.getByRole("radio", { name: "Dracula", exact: true }).click();
  await expect.poll(() => backgroundOf(page)).toBe("rgb(40, 42, 54)");
  await page.keyboard.press("Escape");

  // The choice is there again when the app starts, before the settings are opened
  const second = await first.restart({ env: { MARKTWAIN_TEST_IMAGE_PATH: join(first.dir, "violet.marktwain.colortheme") } });
  const page2 = await second.app.firstWindow();
  await expect.poll(() => backgroundOf(page2)).toBe("rgb(40, 42, 54)");

  // A file of the format is added, chosen, and kept apart from those of the app
  dialog = await openThemes(page2);
  await dialog.getByRole("button", { name: "Import a theme file" }).click();
  const mine = dialog.getByRole("radio", { name: "My Violet", exact: true });
  await expect(mine).toBeChecked();
  await expect.poll(() => backgroundOf(page2)).toBe("rgb(27, 16, 48)");
  expect(await isDark(page2)).toBe(true);

  // It stays across a start of the app, and removing it brings the look of the app back
  const third = await second.restart({ env: { MARKTWAIN_TEST_IMAGE_PATH: join(first.dir, "violet.marktwain.colortheme") } });
  const page3 = await third.app.firstWindow();
  await expect.poll(() => backgroundOf(page3)).toBe("rgb(27, 16, 48)");
  dialog = await openThemes(page3);
  await dialog.getByRole("button", { name: "Remove My Violet" }).click();
  await expect(dialog.getByRole("radio", { name: "My Violet" })).toHaveCount(0);
  await expect(dialog.getByRole("radio", { name: "MarkTwain", exact: true })).toBeChecked();
  await expect.poll(() => backgroundOf(page3)).toBe(defaultBackground);
  expect(await isDark(page3)).toBe(false);
});

test("a file that is not a theme is refused with the part that is wrong, and nothing is added", async ({ launch }) => {
  const { app } = await launch({
    name: "壞主題",
    env: (folder) => {
      mkdirSync(folder, { recursive: true });
      writeFileSync(join(folder, "bad.marktwain.colortheme"), "name: Bad\nmode: dark\ncolors:\n  background: '#000000'\n  foreground: '#ffffff'\n");
      return { MARKTWAIN_TEST_IMAGE_PATH: join(folder, "bad.marktwain.colortheme") };
    },
  });
  const page = await app.firstWindow();
  const dialog = await openThemes(page);
  const before = await dialog.getByRole("radio").count();
  await dialog.getByRole("button", { name: "Import a theme file" }).click();
  await expect(dialog.getByRole("alert")).toContainText("colors.primary");
  expect(await dialog.getByRole("radio").count()).toBe(before);
});

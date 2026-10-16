import { expect, test } from "../../support/test";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { closeProject, createProject, seedChapter } from "../../support/project";
import { DIST, REPO_ROOT } from "../../support/paths";
import { findBundledTypst } from "../../support/find-app";

const TEX_TEMPLATE_DIR = join(REPO_ROOT, "resources/templates/tex");

/** The folder of the TeX binaries of this computer, null when there is none. */
function findTexBin(): string | null {
  if (process.env.MARKTWAIN_TEX_BIN) return process.env.MARKTWAIN_TEX_BIN;
  try {
    const found = execFileSync(process.platform === "win32" ? "where" : "which", ["xelatex"], { encoding: "utf8" }).split(/\r?\n/)[0];
    return found ? dirname(found) : null;
  } catch {
    return null;
  }
}

function hasTypst(): boolean {
  try {
    execFileSync(process.env.MARKTWAIN_TYPST || findBundledTypst(DIST), ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const currentEngine = (page: import("@playwright/test").Page) =>
  page.evaluate(async () => {
    const r = await window.marktwain.invoke("project:current");
    return r.ok ? (r.data?.engine ?? null) : null;
  });

test("a new project asks for its output first, and says that it cannot be changed", async ({ launch }) => {
  // A TeX folder that does not exist turns LaTeX off, whatever this computer has
  const session = await launch({ name: "輸出", projectName: "論文.marktwain", env: { MARKTWAIN_TEX_BIN: "/nowhere" } });
  const page = await session.app.firstWindow();
  await page.getByRole("button", { name: "New project" }).click();
  const dialog = page.getByTestId("engine-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("note")).toContainText("cannot be changed after the project is created");
  await expect(dialog.getByRole("radio", { name: /Typst/ })).toBeChecked();
  await expect(dialog.getByRole("radio", { name: /Word/ })).toBeDisabled();
  await expect(dialog.getByRole("radio", { name: /LaTeX/ })).toBeDisabled();
  await expect(dialog).toContainText("No TeX Live was found");

  // Cancelling creates nothing
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  expect(await currentEngine(page)).toBeNull();
  expect(existsSync(session.file)).toBe(false);

  await createProject(page);
  await expect(page.getByRole("complementary", { name: "Documents" })).toBeVisible();
  expect(await currentEngine(page)).toBe("typst");
});

test.describe("with a TeX Live", () => {
  const texBin = findTexBin();
  test.skip(texBin === null || !existsSync(TEX_TEMPLATE_DIR), "needs a TeX Live and the fetched LaTeX template");

  // The template is the one that travels inside the packaged app, no variable points to it
  test("a LaTeX project builds its PDF with LaTeX and has no Typst project to export", async ({ launch }) => {
    const first = await launch({
      name: "拉鐵",
      projectName: "論文.marktwain",
      env: (folder) => ({ MARKTWAIN_TEX_BIN: texBin as string, MARKTWAIN_TEST_EXPORT_PATH: join(folder, "輸出.pdf") }),
    });
    const page = await first.app.firstWindow();
    await createProject(page, "en-US", "latex");
    expect(await currentEngine(page)).toBe("latex");
    await seedChapter(page, "# 緒論\n\n這是**第一章**，公式 $x^2$。\n");

    await page.getByRole("button", { name: "Preview" }).click();
    await page.getByRole("button", { name: "Export" }).click();
    // The folder of a project is for Typst only, the PDF is the same for both
    await expect(page.getByRole("menuitem", { name: "Export Typst project…" })).toHaveCount(0);
    await page.getByRole("menuitem", { name: "Export draft PDF…" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Exported to" })).toBeVisible({ timeout: 120_000 });
    expect(readFileSync(join(first.dir, "輸出.pdf")).subarray(0, 5).toString()).toBe("%PDF-");

    // The engine stays after the project is closed and opened again
    await closeProject(page);
    await page.getByRole("button", { name: /論文/ }).first().click();
    expect(await currentEngine(page)).toBe("latex");
  });
});

test.describe("Typst", () => {
  test.skip(!hasTypst(), "needs typst");

  test("the engine of a Typst project is kept when it is opened again", async ({ launch }) => {
    const { app } = await launch({ name: "圖", projectName: "論文.marktwain" });
    const page = await app.firstWindow();
    await createProject(page);
    expect(await currentEngine(page)).toBe("typst");
    await closeProject(page);
    await page.getByRole("button", { name: /論文/ }).first().click();
    expect(await currentEngine(page)).toBe("typst");
  });
});

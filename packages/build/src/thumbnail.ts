import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { run } from "./build-typst";

export type ThumbnailInput = {
  typst: string;
  /** Directory under which a temporary directory is made */
  workDir: string;
  /** Name of the file with its extension, which tells typst how to read it */
  name: string;
  data: Uint8Array;
  /** Width of the picture in points */
  width?: number;
};

const SAFE_NAME = /^[A-Za-z0-9._-]+$/;

/** A PNG of an image or a one page PDF, made by typst so every kind of file the template accepts can be shown. Null when it cannot be read. */
export async function renderThumbnail(input: ThumbnailInput): Promise<Uint8Array | null> {
  if (!SAFE_NAME.test(input.name)) return null;
  const root = mkdtempSync(join(input.workDir, "mt-thumb-"));
  try {
    writeFileSync(join(root, input.name), input.data);
    writeFileSync(
      join(root, "t.typ"),
      `#set page(width: ${input.width ?? 200}pt, height: auto, margin: 0pt)\n#image("${input.name}", width: 100%)\n`,
    );
    const { code } = await run(input.typst, ["compile", "t.typ", "out.png", "--format", "png", "--ppi", "96"], root, 20_000);
    return code === 0 ? readFileSync(join(root, "out.png")) : null;
  } catch {
    return null;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

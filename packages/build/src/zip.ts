import { createWriteStream, readdirSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import { ZipFile } from "yazl";

/** The files under a folder, as paths with forward slashes relative to it, in a fixed order. */
function filesUnder(folder: string, prefix = ""): string[] {
  return readdirSync(folder)
    .sort()
    .flatMap((name) => {
      const full = join(folder, name);
      const relative = prefix ? posix.join(prefix, name) : name;
      return statSync(full).isDirectory() ? filesUnder(full, relative) : [relative];
    });
}

/**
 * Packs a folder into a zip that unpacks into one folder with the given name, so the person does not get
 * a pile of files in the place where they unzip it.
 */
export function zipFolder(folder: string, zipPath: string, rootName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const zip = new ZipFile();
    const out = createWriteStream(zipPath);
    out.on("close", resolve);
    out.on("error", reject);
    zip.outputStream.on("error", reject);
    zip.outputStream.pipe(out);
    for (const relative of filesUnder(folder)) zip.addFile(join(folder, ...relative.split("/")), posix.join(rootName, relative));
    zip.end();
  });
}

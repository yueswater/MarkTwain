import { detectFormat, importEntries } from "@marktwain/schema";
import type { BuildFile } from "./types";

/**
 * The keys that the bibliography files hold, null when a file cannot be read, so a citation is not blamed for a file that could not be parsed.
 * The keys of a file that is a plain list in a format that the template reads by itself are found the same way as the editor finds them.
 */
export function bibliographyKeys(files: readonly BuildFile[]): Set<string> | null {
  const keys = new Set<string>();
  const decoder = new TextDecoder();
  for (const file of files) {
    try {
      const source = decoder.decode(file.data);
      const result = importEntries(detectFormat(file.path, source), source);
      if (result.entries.length === 0 && result.errors.length > 0) return null;
      for (const entry of result.entries) keys.add(entry.key);
    } catch {
      return null;
    }
  }
  return keys;
}

import { createHash } from "node:crypto";
import type { Hash } from "./types";

/** The hash of the text of a block. Blocks with the same text have the same hash, which is how blocks are told apart without ids. */
export function hashText(text: string): Hash {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** The hash of the bytes of a file. */
export function hashBytes(data: Uint8Array): Hash {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Detects opening and closing of code fences, shared by splitBlocks and the div rules so both agree.
 *
 * In CommonMark the info string of a backtick fence cannot contain backticks, so ``` ``a ``` is inline code
 * and not a fence. Tilde fences have no such limit.
 */
export function fenceMarker(line: string): string | null {
  const backticks = /^(`{3,})([^`]*)$/.exec(line);
  if (backticks) return backticks[1] ?? null;
  const tildes = /^(~{3,})/.exec(line);
  return tildes ? (tildes[1] ?? null) : null;
}

/** A closing fence, the same character, at least as long and nothing else on the line. */
export function isFenceClose(line: string, marker: string): boolean {
  const bare = line.trim();
  return bare.length >= marker.length && bare === marker.charAt(0).repeat(bare.length);
}

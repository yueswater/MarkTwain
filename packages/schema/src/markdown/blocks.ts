const FENCE_OPEN = /^(`{3,}|~{3,})/;
const DIV_OPEN = /^:{3,}\s*\S/;
const DIV_CLOSE = /^:{3,}\s*$/;

/**
 * 把 Markdown 切成頂層區塊。區塊以空行分隔；下列結構整體算一個區塊，
 * 內部的空行不分隔：圍欄程式碼、獨立成行的 `$$` 包夾的區塊公式、
 * `:::` 圍欄 div（可巢狀）。未關閉的結構一路延伸到文件結尾。
 */
export function splitBlocks(markdown: string): string[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  let fence: string | null = null;
  let inMath = false;
  let divDepth = 0;

  const flush = (): void => {
    if (current.length > 0) {
      blocks.push(current.join("\n"));
      current = [];
    }
  };

  for (const line of lines) {
    if (fence !== null) {
      current.push(line);
      const bare = line.trim();
      if (bare.length >= fence.length && bare === fence.charAt(0).repeat(bare.length)) {
        fence = null;
      }
      continue;
    }

    if (inMath) {
      current.push(line);
      if (line.trim() === "$$") inMath = false;
      continue;
    }

    if (line.trim() === "") {
      if (divDepth === 0) flush();
      else current.push(line);
      continue;
    }

    const fenceOpen = FENCE_OPEN.exec(line);
    if (fenceOpen) {
      fence = fenceOpen[1] ?? "```";
    } else if (line.trim() === "$$") {
      inMath = true;
    } else if (DIV_OPEN.test(line)) {
      divDepth += 1;
    } else if (DIV_CLOSE.test(line)) {
      divDepth = Math.max(0, divDepth - 1);
    }
    current.push(line);
  }

  flush();
  return blocks;
}

/** 以單一空行串接區塊並加上結尾換行；沒有區塊時回傳空字串。 */
export function joinBlocks(blocks: string[]): string {
  return blocks.length === 0 ? "" : `${blocks.join("\n\n")}\n`;
}

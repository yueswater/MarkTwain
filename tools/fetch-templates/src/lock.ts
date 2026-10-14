import { REPO_PATTERN, SHA_PATTERN, TEMPLATE_NAMES } from "./config";
import type { TemplateEntry, TemplateLock, TemplateName } from "./types";

export function parseLock(text: string): TemplateLock {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("templates.lock.json 不是有效的 JSON");
  }

  const templates = (data as { templates?: Record<string, unknown> } | null)?.templates;
  if (!templates || typeof templates !== "object") {
    throw new Error('templates.lock.json 缺少 "templates"');
  }

  const out = {} as Record<TemplateName, TemplateEntry>;
  for (const name of TEMPLATE_NAMES) {
    const entry = templates[name] as Partial<TemplateEntry> | undefined;
    if (!entry || typeof entry !== "object") {
      throw new Error(`templates.lock.json 缺少 "${name}"`);
    }
    if (typeof entry.repo !== "string" || !REPO_PATTERN.test(entry.repo)) {
      throw new Error(`"${name}".repo 格式應為 owner/name`);
    }
    if (typeof entry.tag !== "string" || entry.tag === "") {
      throw new Error(`"${name}".tag 不可為空`);
    }
    if (typeof entry.commit !== "string" || !SHA_PATTERN.test(entry.commit)) {
      throw new Error(`"${name}".commit 應為 40 位小寫十六進位`);
    }
    out[name] = { repo: entry.repo, tag: entry.tag, commit: entry.commit };
  }
  return { templates: out };
}

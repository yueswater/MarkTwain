import { common, createLowlight } from "lowlight";
import latex from "highlight.js/lib/languages/latex";
import matlab from "highlight.js/lib/languages/matlab";
import julia from "highlight.js/lib/languages/julia";
import stata from "highlight.js/lib/languages/stata";

/** The languages that the editor highlights, the common set of highlight.js plus a few that thesis authors use. */
export const lowlight = createLowlight(common);
lowlight.register({ latex, matlab, julia, stata });

/** Languages offered in the picker, in the order shown. The value is the name written after the code fence. */
export const CODE_LANGUAGES = [
  "python",
  "r",
  "matlab",
  "julia",
  "stata",
  "javascript",
  "typescript",
  "java",
  "c",
  "cpp",
  "csharp",
  "go",
  "rust",
  "sql",
  "bash",
  "shell",
  "json",
  "yaml",
  "xml",
  "css",
  "latex",
  "markdown",
  "diff",
] as const;

/** Display names that differ from the identifier. */
export const LANGUAGE_LABELS: Record<string, string> = {
  cpp: "C++",
  csharp: "C#",
  javascript: "JavaScript",
  typescript: "TypeScript",
  latex: "LaTeX",
  matlab: "MATLAB",
  sql: "SQL",
  json: "JSON",
  yaml: "YAML",
  xml: "HTML / XML",
  css: "CSS",
  r: "R",
  c: "C",
  go: "Go",
  java: "Java",
  python: "Python",
  rust: "Rust",
  julia: "Julia",
  stata: "Stata",
  bash: "Bash",
  shell: "Shell",
  markdown: "Markdown",
  diff: "Diff",
};

export function languageLabel(language: string): string {
  return LANGUAGE_LABELS[language] ?? language;
}

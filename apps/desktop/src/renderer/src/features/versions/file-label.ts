/** What a person calls a file of the project: the settings of the thesis instead of config.yml, the other files by their own name. */
export function fileLabel(path: string, configLabel: string): string {
  return path === "config.yml" ? configLabel : path;
}

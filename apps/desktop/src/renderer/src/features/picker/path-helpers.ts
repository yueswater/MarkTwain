/** The separator that a path uses, Windows paths have backslashes. */
export function separatorOf(path: string): "/" | "\\" {
  return path.includes("\\") && !path.includes("/") ? "\\" : "/";
}

export function joinPath(folder: string, name: string): string {
  const sep = separatorOf(folder);
  return folder.endsWith(sep) ? `${folder}${name}` : `${folder}${sep}${name}`;
}

/** Every folder from the top down to this one, each with the path that opens it. */
export function crumbsOf(path: string): { name: string; path: string }[] {
  const sep = separatorOf(path);
  const parts = path.split(sep).filter(Boolean);
  const crumbs: { name: string; path: string }[] = [];
  let current = "";
  if (sep === "/") {
    crumbs.push({ name: "/", path: "/" });
    current = "";
  } else {
    const drive = parts.shift() ?? "";
    current = `${drive}\\`;
    crumbs.push({ name: drive, path: current });
  }
  for (const part of parts) {
    current = sep === "/" ? `${current}/${part}` : current.endsWith("\\") ? `${current}${part}` : `${current}\\${part}`;
    crumbs.push({ name: part, path: current });
  }
  return crumbs;
}

const FORBIDDEN = /[\\/:*?"<>|]/;

/** A name that can be the file name of a project: not empty, and none of the characters that file systems refuse. */
export function isValidName(name: string): boolean {
  const clean = name.trim();
  return clean !== "" && clean !== "." && clean !== ".." && !FORBIDDEN.test(clean);
}

/** The file name of a project, the extension is added when the person left it out. */
export function withProjectExtension(name: string, extension: string): string {
  const clean = name.trim();
  return clean.toLowerCase().endsWith(`.${extension}`) ? clean : `${clean}.${extension}`;
}

/** The name of the file at the end of a path, whichever separator the path has. */
export function fileNameOf(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

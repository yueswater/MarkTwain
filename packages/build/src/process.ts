import { spawn } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type RunOptions = {
  env?: Record<string, string>;
  /** Stop the whole tree of processes on a timeout, latexmk starts xelatex and a plain kill leaves it running */
  killTree?: boolean;
};

/** Stops a process and everything it started. */
function killTree(pid: number | undefined): void {
  if (pid === undefined) return;
  if (process.platform === "win32") {
    // child.kill() on Windows ends only the process itself
    spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    return;
  }
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    // The group is already gone
  }
}

export function run(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
  env?: Record<string, string>,
  options: Pick<RunOptions, "killTree"> = {},
): Promise<{ code: number | null; stderr: string; stdout: string }> {
  return new Promise((resolve) => {
    const tree = options.killTree === true;
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      env: env ? { ...process.env, ...env } : process.env,
      // Its own process group on the other systems, so the timeout can end all of it
      detached: tree && process.platform !== "win32",
    });
    let stderr = "";
    let stdout = "";
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf8")));
    const timer = setTimeout(() => (tree ? killTree(child.pid) : child.kill()), timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ code: null, stderr: `error: ${error.message}`, stdout });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stderr, stdout });
    });
  });
}

/** Copies a file or folder, following links. fs.cpSync skipped folders on the Windows runner, so this walks the tree. */
export function copyTree(source: string, destination: string): void {
  if (statSync(source).isDirectory()) {
    mkdirSync(destination, { recursive: true });
    for (const name of readdirSync(source)) copyTree(join(source, name), join(destination, name));
  } else {
    copyFileSync(source, destination);
  }
}

export function writeText(root: string, path: string, text: string): void {
  const full = join(root, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, text);
}

export function writeBytes(root: string, path: string, data: Uint8Array): void {
  const full = join(root, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, data);
}

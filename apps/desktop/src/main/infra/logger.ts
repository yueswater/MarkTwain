import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync } from "node:fs";
import { dirname } from "node:path";

export type LogLevel = "INFO" | "WARN" | "ERROR";

/** The log file is moved aside to <file>.1 when it grows past this. */
const MAX_LOG_BYTES = 256 * 1024;

/**
 * The local log of the app. It is read by the person only, through the diagnostics export, and it is never sent.
 * Lines hold codes and versions and never the text or the file names of a thesis, callers pass nothing else.
 */
let logFile: string | null = null;
let clock: () => Date = () => new Date();

/** Points the log at a file, before this nothing is written so tests leave no files. */
export function setLogFile(path: string | null, now: () => Date = () => new Date()): void {
  logFile = path;
  clock = now;
}

function write(level: LogLevel, tag: string, message: string): void {
  if (!logFile) return;
  const line = `${clock().toISOString()} ${level} ${tag} ${message.replace(/\s+/g, " ").trim()}\n`;
  try {
    mkdirSync(dirname(logFile), { recursive: true });
    if (existsSync(logFile) && statSync(logFile).size > MAX_LOG_BYTES) renameSync(logFile, `${logFile}.1`);
    appendFileSync(logFile, line);
  } catch {
    // A log that cannot be written must never break the app
  }
}

export const log = {
  info: (tag: string, message: string) => write("INFO", tag, message),
  warn: (tag: string, message: string) => write("WARN", tag, message),
  error: (tag: string, message: string) => write("ERROR", tag, message),
};

/**
 * What is safe to write about an error: its kind, its code and the places in the program it passed, never its message,
 * since the message of a failed build or a failed read can hold a path or a piece of the thesis.
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    const params = (error as { params?: unknown }).params;
    const parts = [error.name];
    if (typeof code === "string") parts.push(`code=${code}`);
    if (params && typeof params === "object") parts.push(`params=${Object.keys(params).join(",")}`);
    const frames = (error.stack ?? "")
      .split("\n")
      .filter((line) => line.trimStart().startsWith("at "))
      .slice(0, 4)
      .map((line) => line.trim().replace(/\(.*[\\/]([^\\/)]+)\)$/, "($1)").replace(/^at .*[\\/]([^\\/]+)$/, "at $1"));
    return frames.length > 0 ? `${parts.join(" ")} ${frames.join(" | ")}` : parts.join(" ");
  }
  return typeof error;
}

/** The last lines of the log, the older file first when the newest holds too few. */
export function readLogTail(maxLines: number, path: string | null = logFile): string[] {
  if (!path) return [];
  const read = (file: string): string[] => {
    try {
      return readFileSync(file, "utf8").split("\n").filter((line) => line !== "");
    } catch {
      return [];
    }
  };
  const lines = read(path);
  if (lines.length < maxLines) lines.unshift(...read(`${path}.1`));
  return lines.slice(-maxLines);
}

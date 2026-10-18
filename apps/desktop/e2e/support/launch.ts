import { _electron as electron, type ElectronApplication } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findPackagedExecutable } from "./find-app";
import { DIST, TEMPLATE_DIR } from "./paths";

export type Lang = "en-US" | "zh-TW";

export type LaunchOptions = {
  /** Interface language, English unless a test is about Chinese text */
  lang?: Lang;
  /** Part of the name of the temporary folder, it only helps to tell folders apart when one is left behind */
  name?: string;
  /** File name of the project inside the folder, the open and save dialogs answer with it */
  projectName?: string;
  /** More switches for the app, such as a scale factor */
  args?: string[];
  /** A folder that an earlier launch made, to start the app again on the same project and settings */
  dir?: string;
  /** Test hooks and other variables of the environment, MARKTWAIN_TEST_DIALOG_PATH is set from projectName. A function gets the folder, for a hook that points to a file in it. */
  env?: Record<string, string> | ((dir: string) => Record<string, string>);
};

export type Session = {
  app: ElectronApplication;
  /** The temporary folder that holds the project file and the user data of the app */
  dir: string;
  /** The project file that the dialogs answer with */
  file: string;
  lang: Lang;
  /** Closes the app and keeps the folder */
  stop: () => Promise<void>;
  /** Closes the app, and removes the folder when this launch made it */
  close: () => Promise<void>;
  /** Closes the app and starts it again on the same folder, as a person quits and opens it once more */
  restart: (options?: Omit<LaunchOptions, "dir">) => Promise<Session>;
};

/** True when the window should be shown, set by the headed config. Otherwise the app runs without a window on the screen. */
const headed = process.env.E2E_HEADED === "1";

export async function launchApp(options: LaunchOptions = {}): Promise<Session> {
  const lang = options.lang ?? "en-US";
  const ownsDir = options.dir === undefined;
  const dir = options.dir ?? mkdtempSync(join(tmpdir(), `marktwain ${options.name ?? "e2e"} `));
  const file = join(dir, options.projectName ?? "p.marktwain");
  const args = [`--user-data-dir=${join(dir, "userData")}`, `--lang=${lang}`, ...(options.args ?? [])];
  if (process.platform === "linux") args.push("--no-sandbox");
  const app = await electron.launch({
    executablePath: findPackagedExecutable(DIST),
    args,
    env: {
      ...process.env,
      ...(headed ? {} : { MARKTWAIN_HEADLESS: "1" }),
      MARKTWAIN_TEST_NO_ANIMATION: "1",
      // A new chapter starts empty in the tests, the tests of the default heading set this to an empty text
      MARKTWAIN_TEST_NO_DEFAULT_HEADING: "1",
      MARKTWAIN_TEST_DIALOG_PATH: file,
      MARKTWAIN_TEMPLATE_DIR: TEMPLATE_DIR,
      ...(typeof options.env === "function" ? options.env(dir) : options.env),
    },
  });
  let stopped = false;
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    await app.close().catch(() => undefined);
  };
  const session: Session = {
    app,
    dir,
    file,
    lang,
    stop,
    close: async () => {
      await stop();
      if (ownsDir) rmSync(dir, { recursive: true, force: true });
    },
    restart: async (next = {}) => {
      await stop();
      return launchApp({ lang, projectName: options.projectName, env: options.env, args: options.args, ...next, dir });
    },
  };
  return session;
}

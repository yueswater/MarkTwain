import { test as base, expect } from "@playwright/test";
import { launchApp, type LaunchOptions, type Session } from "./launch";

type Fixtures = {
  /** Starts the app, every app that a test starts is closed and its folder removed when the test ends, also when it fails */
  launch: (options?: LaunchOptions) => Promise<Session>;
};

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  launch: async ({}, use) => {
    const sessions: Session[] = [];
    // A session that restart() makes is a session of the same folder, so it is followed here too
    const track = (session: Session): Session => {
      sessions.push(session);
      const restart = session.restart;
      return { ...session, restart: async (next) => track(await restart(next)) };
    };
    await use(async (options) => track(await launchApp(options)));
    // The last launch goes first, so that one that reuses the folder of an earlier one is closed before it
    for (const session of sessions.reverse()) await session.close();
  },
});

export { expect };

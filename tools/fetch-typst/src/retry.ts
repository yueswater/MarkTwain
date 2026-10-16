/** Tries again when a download fails for a reason that a moment can mend: no connection, a timeout, a busy server. A missing file will not come back, so it is not tried again. */
export class PermanentError extends Error {}

export async function withRetry<T>(
  attempt: () => Promise<T>,
  options: { tries?: number; delayMs?: number; sleep?: (ms: number) => Promise<void>; onRetry?: (error: unknown, next: number) => void } = {},
): Promise<T> {
  const tries = options.tries ?? 4;
  const delayMs = options.delayMs ?? 1000;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  for (let number = 1; ; number += 1) {
    try {
      return await attempt();
    } catch (error) {
      if (error instanceof PermanentError || number >= tries) throw error;
      options.onRetry?.(error, number + 1);
      // One second, two, four
      await sleep(delayMs * 2 ** (number - 1));
    }
  }
}

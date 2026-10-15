export type Edge = "start" | "end";

/** How far a person has to push against the edge, in the pixels that the wheel reports, before the next document opens. */
export const FLIP_DISTANCE = 140;
/** A pause this long ends a swipe, what comes after is a new one. */
export const QUIET_MS = 200;

export type Push = { edge: Edge | null; progress: number; flip: Edge | null };

/**
 * Tells when the wheel is pushing against an end of the document on purpose.
 * A swipe that reaches the end on its own, or its momentum, does not count: only a swipe that begins while the document is already at that end does.
 */
export class EdgeFlip {
  private last = Number.NEGATIVE_INFINITY;
  private sum = 0;
  private armed = false;
  private edge: Edge | null = null;

  push(now: number, deltaY: number, atStart: boolean, atEnd: boolean): Push {
    const pushed: Edge | null = deltaY > 0 && atEnd ? "end" : deltaY < 0 && atStart ? "start" : null;
    const fresh = now - this.last > QUIET_MS;
    this.last = now;
    if (fresh) {
      this.armed = pushed !== null;
      this.sum = 0;
      this.edge = pushed;
    }
    if (!this.armed || pushed === null || pushed !== this.edge) {
      this.sum = 0;
      return { edge: null, progress: 0, flip: null };
    }
    this.sum += Math.abs(deltaY);
    if (this.sum >= FLIP_DISTANCE) {
      this.armed = false;
      this.sum = 0;
      return { edge: pushed, progress: 1, flip: pushed };
    }
    return { edge: pushed, progress: this.sum / FLIP_DISTANCE, flip: null };
  }

  reset(): void {
    this.last = Number.NEGATIVE_INFINITY;
    this.sum = 0;
    this.armed = false;
    this.edge = null;
  }
}

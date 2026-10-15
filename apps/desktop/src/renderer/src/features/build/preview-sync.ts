import type { BuildAnchor } from "../../../../shared/ipc";

/** A block of a document, the index counts the top level blocks. */
export type BlockRef = { documentId: string; block: number };

function parse(anchor: BuildAnchor): BlockRef | null {
  const colon = anchor.id.lastIndexOf(":");
  const block = Number(anchor.id.slice(colon + 1));
  return colon > 0 && Number.isInteger(block) ? { documentId: anchor.id.slice(0, colon), block } : null;
}

/**
 * Where a block is on the pages. A block that put nothing on the page has no marker, so the nearest block before it stands in,
 * and when there is none before, the nearest after.
 */
export function anchorFor(anchors: readonly BuildAnchor[], target: BlockRef): BuildAnchor | null {
  let before: { anchor: BuildAnchor; block: number } | null = null;
  let after: { anchor: BuildAnchor; block: number } | null = null;
  for (const anchor of anchors) {
    const ref = parse(anchor);
    if (!ref || ref.documentId !== target.documentId) continue;
    if (ref.block === target.block) return anchor;
    if (ref.block < target.block && (!before || ref.block > before.block)) before = { anchor, block: ref.block };
    if (ref.block > target.block && (!after || ref.block < after.block)) after = { anchor, block: ref.block };
  }
  return (before ?? after)?.anchor ?? null;
}

/** The block that holds a point of a page, the last marker at or above the point, null above the first marker. */
export function blockAt(anchors: readonly BuildAnchor[], page: number, y: number): BlockRef | null {
  let best: BuildAnchor | null = null;
  for (const anchor of anchors) {
    const above = anchor.page < page || (anchor.page === page && anchor.y <= y);
    if (!above) continue;
    if (!best || anchor.page > best.page || (anchor.page === best.page && anchor.y >= best.y)) best = anchor;
  }
  return best ? parse(best) : null;
}

/**
 * Where on the pages the top of the editor is: the marker of the block at the top, and a share of the way to the next block when both
 * landed on the same page, so the preview moves smoothly while a long paragraph passes.
 */
export function spot(anchors: readonly BuildAnchor[], target: BlockRef, fraction: number): { page: number; y: number } | null {
  const own = anchorFor(anchors, target);
  if (!own) return null;
  const next = anchors.find((anchor) => anchor.id === `${target.documentId}:${target.block + 1}`) ?? null;
  const exact = own.id === `${target.documentId}:${target.block}`;
  if (!exact || !next || next.page !== own.page || next.y < own.y) return { page: own.page, y: own.y };
  const share = Math.min(Math.max(fraction, 0), 1);
  return { page: own.page, y: own.y + share * (next.y - own.y) };
}

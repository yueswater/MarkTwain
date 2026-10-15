/** A rectangle in fractions of the image, from 0 to 1. */
export type Rect = { x: number; y: number; w: number; h: number };

export const FULL: Rect = { x: 0, y: 0, w: 1, h: 1 };
const MIN = 0.05;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Moves the rectangle by a fraction of the image and keeps it inside. */
export function moveRect(rect: Rect, dx: number, dy: number): Rect {
  return { ...rect, x: clamp(rect.x + dx, 0, 1 - rect.w), y: clamp(rect.y + dy, 0, 1 - rect.h) };
}

export type Corner = "nw" | "ne" | "sw" | "se";

/** Drags one corner by a fraction of the image, the opposite corner stays, and the rectangle never gets tiny or leaves the image. */
export function resizeRect(rect: Rect, corner: Corner, dx: number, dy: number): Rect {
  let left = rect.x;
  let top = rect.y;
  let right = rect.x + rect.w;
  let bottom = rect.y + rect.h;
  if (corner.endsWith("w")) left = clamp(left + dx, 0, right - MIN);
  else right = clamp(right + dx, left + MIN, 1);
  if (corner.startsWith("n")) top = clamp(top + dy, 0, bottom - MIN);
  else bottom = clamp(bottom + dy, top + MIN, 1);
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/** The pixel box of the rectangle in an image of the given natural size. */
export function pixelBox(rect: Rect, width: number, height: number): { sx: number; sy: number; sw: number; sh: number } {
  return {
    sx: Math.round(rect.x * width),
    sy: Math.round(rect.y * height),
    sw: Math.max(1, Math.round(rect.w * width)),
    sh: Math.max(1, Math.round(rect.h * height)),
  };
}

export function isFull(rect: Rect): boolean {
  return rect.x <= 0.001 && rect.y <= 0.001 && rect.w >= 0.999 && rect.h >= 0.999;
}

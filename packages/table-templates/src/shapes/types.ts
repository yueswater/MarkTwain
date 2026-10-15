import type { ParamValue } from "../schema";

export type ShapeInput = {
  params: Record<string, ParamValue>;
  /** The texts of the template in the language that was asked for */
  labels: Record<string, string>;
};

/** A shape turns the parameters and the texts of a template into a table written in the Markdown of MarkTwain. */
export type Shape = (input: ShapeInput) => string;

/** A text with {n} replaced by a number. */
export function numbered(text: string, n: number): string {
  return text.replace(/\{n\}/g, String(n));
}

/** The names of a label that holds several names separated by commas. */
export function names(text: string): string[] {
  return text.split(",").map((name) => name.trim());
}

export const int = (value: unknown, fallback = 1): number => (typeof value === "number" && Number.isFinite(value) ? Math.max(1, Math.round(value)) : fallback);

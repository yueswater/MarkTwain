import { baseline } from "./baseline";
import { comparison } from "./comparison";
import { confusion } from "./confusion";
import { correlation } from "./correlation";
import { descriptive } from "./descriptive";
import { literature } from "./literature";
import { loadings } from "./loadings";
import { payoff } from "./payoff";
import { plain } from "./plain";
import { regression } from "./regression";
import type { Shape } from "./types";

/** The shared shapes, every template names one of them. */
export const SHAPES: Record<string, Shape> = { plain, payoff, regression, descriptive, correlation, baseline, confusion, comparison, loadings, literature };

export const SHAPE_NAMES: readonly string[] = Object.keys(SHAPES);

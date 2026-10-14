export { joinBlocks, splitBlocks } from "./markdown/blocks";
export { LABEL_KINDS, type LabelKind } from "./labels/constants";
export { createLabel, findDuplicateLabels, isValidLabel, labelKind } from "./labels/labels";
export { resolveNumbers } from "./numbering/numbering";
export type {
  CountedTarget,
  HeadingTarget,
  NumberingOptions,
  NumberingResult,
  Target,
} from "./numbering/types";

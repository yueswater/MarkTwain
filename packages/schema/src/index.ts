export { joinBlocks, splitBlocks } from "./markdown/blocks";
export { formatAttributes, parseAttributes, type Attributes } from "./markdown/attributes";
export { parseInlineMarkdown, parseMarkdown, type DocJson } from "./markdown/parse";
export { serializeMarkdown } from "./markdown/serialize";
export { MarkName, NodeName } from "./model/names";
export { schema } from "./model/schema";
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
export { collectTargets, type CollectedTargets } from "./numbering/collect";
export {
  ConfigParseError,
  defaultFields,
  readConfig,
  validateConfig,
  writeConfig,
  type ConfigFields,
  type ConfigIssue,
} from "./config/config";
export { SCHOOLS, isKnownSchool, type School } from "./config/schools";

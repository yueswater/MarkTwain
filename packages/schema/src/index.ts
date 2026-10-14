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
export { collectCitations, collectTargets, type CollectedTargets } from "./numbering/collect";
export {
  ConfigParseError,
  defaultFields,
  readConfig,
  validateConfig,
  writeConfig,
  type ConfigFields,
  type ConfigIssue,
} from "./config/config";
export {
  CITATION_STYLES,
  DEGREES,
  DOCUMENT_TYPES,
  LANGUAGES,
  collegesOf,
  departmentsOf,
  findCollege,
  findDepartment,
  type College,
  type Named,
} from "./config/options";
export { SCHOOLS, isKnownSchool, type School } from "./config/schools";
export {
  ADVANCED_FIELDS,
  advancedField,
  getPath,
  inheritedValues,
  isValidAdvanced,
  mergeConfigs,
  readAdvanced,
  writeAdvanced,
  type AdvancedField,
  type AdvancedGroup,
  type AdvancedKind,
  type AdvancedValue,
  type AdvancedValues,
} from "./config/advanced";
export {
  ENTRY_TYPES,
  REQUIRED_FIELDS,
  appendEntry,
  duplicateKeys,
  entryAuthor,
  entryLabel,
  entryYear,
  formatEntry,
  isValidBibKey,
  missingFields,
  parseBibtex,
  removeEntry,
  replaceEntry,
  type BibEntry,
  type BibError,
  type BibParseResult,
} from "./bibliography/bibtex";
export {
  detectFormat,
  importCslJson,
  importEntries,
  importHayagriva,
  type ImportFormat,
  type ImportResult,
  type ImportedEntry,
} from "./bibliography/import";

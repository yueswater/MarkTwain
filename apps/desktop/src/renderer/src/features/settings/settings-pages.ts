import {
  BookOpenIcon,
  GraduationCapIcon,
  IdCardIcon,
  HashIcon,
  ImageIcon,
  KeyboardIcon,
  ListTreeIcon,
  LayoutIcon,
  ListOrderedIcon,
  PaletteIcon,
  PenLineIcon,
  PencilRulerIcon,
  TypeIcon,
  UserRoundIcon,
  SquareSigmaIcon,
  EyeIcon,
  type LucideIcon,
} from "lucide-react";
import { ADVANCED_FIELDS, type AdvancedGroup } from "@marktwain/schema";

export type SettingsSectionId = "editor" | "thesis";

export type SettingsPageId =
  | "editorAppearance"
  | "editorTheme"
  | "editorWriting"
  | "editorShortcuts"
  | "editorStatements"
  | "editorPreview"
  | "editorProfile"
  | "thesisSchool"
  | "thesisInfo"
  | "thesisPage"
  | "thesisText"
  | "thesisHeadings"
  | "thesisCaptions"
  | "thesisLists"
  | "thesisPageNumber"
  | "thesisBibliography";

export type SettingsPage = {
  id: SettingsPageId;
  section: SettingsSectionId;
  icon: LucideIcon;
  /** The thesis pages need an open project */
  needsProject: boolean;
  /** Groups of the format settings that the page shows, empty for the other pages */
  groups: readonly AdvancedGroup[];
};

export const SETTINGS_SECTIONS: readonly SettingsSectionId[] = ["editor", "thesis"];

export const SETTINGS_PAGES: readonly SettingsPage[] = [
  { id: "editorAppearance", section: "editor", icon: PenLineIcon, needsProject: false, groups: [] },
  { id: "editorTheme", section: "editor", icon: PaletteIcon, needsProject: false, groups: [] },
  { id: "editorWriting", section: "editor", icon: PencilRulerIcon, needsProject: false, groups: [] },
  { id: "editorShortcuts", section: "editor", icon: KeyboardIcon, needsProject: false, groups: [] },
  { id: "editorStatements", section: "editor", icon: SquareSigmaIcon, needsProject: false, groups: [] },
  { id: "editorPreview", section: "editor", icon: EyeIcon, needsProject: false, groups: [] },
  { id: "editorProfile", section: "editor", icon: IdCardIcon, needsProject: false, groups: [] },
  { id: "thesisSchool", section: "thesis", icon: GraduationCapIcon, needsProject: true, groups: ["watermark"] },
  { id: "thesisInfo", section: "thesis", icon: UserRoundIcon, needsProject: true, groups: [] },
  { id: "thesisPage", section: "thesis", icon: LayoutIcon, needsProject: true, groups: ["page"] },
  { id: "thesisText", section: "thesis", icon: TypeIcon, needsProject: true, groups: ["text"] },
  { id: "thesisHeadings", section: "thesis", icon: HashIcon, needsProject: true, groups: ["headings", "numbering"] },
  { id: "thesisCaptions", section: "thesis", icon: ImageIcon, needsProject: true, groups: ["captions", "placement", "crossRef", "statements"] },
  { id: "thesisLists", section: "thesis", icon: ListTreeIcon, needsProject: true, groups: ["lists"] },
  { id: "thesisPageNumber", section: "thesis", icon: ListOrderedIcon, needsProject: true, groups: ["pageNumber", "outline"] },
  { id: "thesisBibliography", section: "thesis", icon: BookOpenIcon, needsProject: true, groups: ["bibliography"] },
];

export function pageOf(id: string): SettingsPage {
  return SETTINGS_PAGES.find((page) => page.id === id) ?? SETTINGS_PAGES[0]!;
}

/** The page that shows a group of the format settings. */
export function pageOfGroup(group: AdvancedGroup): SettingsPageId | null {
  return SETTINGS_PAGES.find((page) => page.groups.includes(group))?.id ?? null;
}

export type SettingEntry = {
  /** Id of the row in the page, used to scroll to it */
  id: string;
  page: SettingsPageId;
  /** Where the label of the setting is found: the namespace and the key */
  ns: "settings" | "config";
  key: string;
};

const EDITOR_ENTRIES: readonly [SettingsPageId, string][] = [
  ["editorAppearance", "fontFamily"],
  ["editorAppearance", "fontSize"],
  ["editorAppearance", "lineHeight"],
  ["editorAppearance", "contentWidth"],
  ["editorWriting", "headingNames"],
  ["editorWriting", "lineNumbers"],
  ["editorWriting", "showChanges"],
  ["editorWriting", "spellcheck"],
  ["editorWriting", "codeFontSize"],
  ["editorWriting", "pasteMarkdown"],
  ["editorWriting", "autosaveDelay"],
  ["editorStatements", "statementStyle"],
  ["editorPreview", "previewDelay"],
];

const INFO_FIELDS = ["title", "titleEn", "author", "authorEn", "id", "advisor", "advisorEn", "date", "oralDate", "keywords", "keywordsEn"] as const;
const SCHOOL_FIELDS = ["school", "collegePick", "institutePick", "degree", "language", "citationStyle"] as const;

/** Every setting that can be found by search, with the page it is on. A page can be found by its name and by other words for what is on it. */
export const SETTING_ENTRIES: readonly SettingEntry[] = [
  ...SETTINGS_PAGES.map((page): SettingEntry => ({ id: `page-${page.id}`, page: page.id, ns: "settings", key: `page.${page.id}.title` })),
  { id: "setting-profile-ask", page: "editorProfile", ns: "settings", key: "profile.ask" },
  ...EDITOR_ENTRIES.map(([page, key]): SettingEntry => ({ id: `setting-editor-${key}`, page, ns: "settings", key: `editor.${key}` })),
  ...SCHOOL_FIELDS.map((key): SettingEntry => ({ id: key === "collegePick" ? "config-college" : key === "institutePick" ? "config-institute" : `config-${key === "citationStyle" ? "citation" : key}`, page: "thesisSchool", ns: "config", key: `field.${key}` })),
  ...INFO_FIELDS.map((key): SettingEntry => ({ id: `config-${key}`, page: "thesisInfo", ns: "config", key: `field.${key}` })),
  ...ADVANCED_FIELDS.flatMap((field): SettingEntry[] => {
    const page = pageOfGroup(field.group);
    return page ? [{ id: `setting-${field.path}`, page, ns: "settings", key: `field.${field.path}` }] : [];
  }),
];

/** Settings whose label contains the query, ignoring case and spaces. The words of a page, such as 目錄 for the page of the page numbers, find the page. */
export function searchSettings(
  query: string,
  labelOf: (entry: SettingEntry) => string,
  keywordsOf: (entry: SettingEntry) => string = () => "",
): { entry: SettingEntry; label: string }[] {
  const needle = query.replace(/\s+/g, "").toLowerCase();
  if (needle === "") return [];
  const contains = (text: string) => text.replace(/\s+/g, "").toLowerCase().includes(needle);
  return SETTING_ENTRIES.flatMap((entry) => {
    const label = labelOf(entry);
    const isPage = entry.id.startsWith("page-");
    return contains(label) || (isPage && contains(keywordsOf(entry))) ? [{ entry, label }] : [];
  });
}

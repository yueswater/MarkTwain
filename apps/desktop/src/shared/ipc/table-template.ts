import { IpcChannel } from "../enums/ipc-channel.enum";

export type TemplateLanguage = "zh-Hant" | "en";

export type TemplateParam =
  | { type: "int"; default: number; min: number; max: number; label: string }
  | { type: "bool"; default: boolean; label: string };

/** A template as the picker needs it, the texts are already in the language that was asked for. */
export type TemplateSummary = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  params: Record<string, TemplateParam>;
  /** What the template needs from the table model, listed so the picker can say it */
  needs: string[];
};

export type TemplateField = { id: string; name: string; templates: TemplateSummary[] };

export type TableTemplateContract = {
  /** The whole library with the texts in one language */
  [IpcChannel.TableTemplateList]: { req: { language: TemplateLanguage }; res: TemplateField[] };
  /** The table of a template as Markdown, parameters that are left out take their defaults */
  [IpcChannel.TableTemplateBuild]: { req: { id: string; language: TemplateLanguage; params: Record<string, number | boolean> }; res: string };
};

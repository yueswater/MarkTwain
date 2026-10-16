import type { AppContract } from "./app";
import type { BuildContract } from "./build";
import type { ExportContract } from "./export";
import type { ConfigContract } from "./config";
import type { DialogContract } from "./dialog";
import type { DocumentContract } from "./document";
import type { MenuCommand } from "./menu";
import type { AssetContract } from "./asset";
import type { BibliographyContract } from "./bibliography";
import type { LabelContract } from "./label";
import type { PrefsContract } from "./prefs";
import type { ProfileContract } from "./profile";
import type { SearchContract } from "./search";
import type { WatermarkContract } from "./watermark";
import type { FontContract } from "./font";
import type { TableTemplateContract } from "./table-template";
import type { VersionContract } from "./version";
import type { ProjectContract } from "./project";
import type { RecentContract } from "./recent";
import type { IpcResult } from "./result";
import type { SettingsContract } from "./settings";

export type { AppInfo } from "./app";
export type { IpcErrorPayload, IpcResult } from "./result";
export type { LocaleView } from "./settings";
export type { DocumentData, DocumentSummary } from "./document";
export type { ProjectInfo } from "./project";
export type { RecentProject } from "./recent";
export type { SearchHit } from "./search";
export type { WatermarkInfo, WatermarkMode, WatermarkPicture } from "./watermark";
export type { TemplateField, TemplateLanguage, TemplateParam, TemplateSummary } from "./table-template";
export type { FontAddResult, FontFamilyEntry, FontFileInput, FontRemoveResult, FontSkipReason, FontSource, FontsView, MissingFont } from "./font";
export type { BibEntryInput, BibImportOutcome, BibItem, BibliographyView } from "./bibliography";
export type { EditorPrefs } from "../prefs";
export type { AuthorProfile } from "../profile";
export type { BuildAnchor, BuildDiagnostic, BuildOutcome } from "./build";
export type { AdvancedState, ConfigState } from "./config";
export type { BranchInfo, ChangeView, ChoiceInput, CompareView, ConflictView, DocumentDiffView, MergePreview, VersionEntry, VersionStatus } from "./version";
export type { LabelIndex, LabelPreview, LabelPreviewContent, LabelReference, LabelTarget, UnlabeledRemote } from "./label";

/** Contracts of all features are merged here, add & XxxContract when adding a feature. */
export type IpcContract = AppContract & SettingsContract & ProjectContract & DocumentContract & DialogContract & LabelContract & AssetContract & ConfigContract & BuildContract & ExportContract & RecentContract & PrefsContract & SearchContract & BibliographyContract & WatermarkContract & ProfileContract & FontContract & TableTemplateContract & VersionContract;

export type IpcChannelName = keyof IpcContract;
export type IpcRequest<C extends IpcChannelName> = IpcContract[C]["req"];
export type IpcResponse<C extends IpcChannelName> = IpcContract[C]["res"];

/** Channels whose request type is void take no second argument. */
export type InvokeArgs<C extends IpcChannelName> = IpcRequest<C> extends void
  ? []
  : [req: IpcRequest<C>];

/** The only API that preload exposes to the renderer, it returns IpcResult and the renderer api wrapper unwraps it. */
export type MarkTwainApi = {
  invoke<C extends IpcChannelName>(
    channel: C,
    ...args: InvokeArgs<C>
  ): Promise<IpcResult<IpcResponse<C>>>;
  /** Subscribes to commands of the native menu, returns an unsubscribe function */
  onMenuCommand(listener: (command: MenuCommand) => void): () => void;
};

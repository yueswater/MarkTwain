import { ChevronUpIcon, DownloadIcon, FileTextIcon, FolderIcon, FolderPlusIcon, HardDriveIcon, HouseIcon, MonitorIcon, FileIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { IpcChannel } from "../../../../shared/enums/ipc-channel.enum";
import type { FileListing, FilePlace } from "../../../../shared/ipc";
import { api } from "../../shared/api";
import { errorMessage } from "../../shared/error-message";
import { crumbsOf, isValidName, joinPath, withProjectExtension } from "./path-helpers";
import { Rich } from "../../shared/rich";

/** What the picker is asked for: a project to open, or a file to write, which is a new project or an export and has the extension of its kind. */
export type PickRequest = { mode: "open" } | { mode: "save"; purpose: "project" | "export"; suggestedName: string; extension: string };

type Props = {
  request: PickRequest;
  /** The path that was chosen, null when the person cancelled */
  onAnswer: (path: string | null) => void;
};

const PLACE_ICONS = { home: HouseIcon, desktop: MonitorIcon, documents: FileTextIcon, downloads: DownloadIcon, drive: HardDriveIcon } as const;

/**
 * The picker of MarkTwain for the place of a new project, a project to open and the files of an export. It shows the folders and the project files
 * only, so there is nothing to sort through, and a new folder can be made on the way.
 */
export function FilePicker({ request, onAnswer }: Props) {
  const { t } = useTranslation("project");
  const { t: tRoot } = useTranslation();
  const saving = request.mode === "save";
  // Only the files of the kind that is asked for are listed, a new project is never put over an old one, a file of an export may replace one
  const extension = request.mode === "save" ? request.extension : "marktwain";
  const exporting = request.mode === "save" && request.purpose === "export";
  const [listing, setListing] = useState<FileListing | null>(null);
  const [name, setName] = useState(request.mode === "save" ? request.suggestedName : "");
  const [selected, setSelected] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (path: string | null) => {
      try {
        setError(null);
        setListing(await api.invoke(IpcChannel.FilesList, { path, extension }));
        setSelected(null);
        setFolderName(null);
      } catch (e) {
        setError(errorMessage(tRoot, e));
      }
    },
    [tRoot, extension],
  );

  useEffect(() => {
    void load(null);
    // Opens once on the place that the app chooses
  }, [load]);

  const fileName = withProjectExtension(name, extension);
  const taken = useMemo(() => listing?.entries.some((entry) => entry.kind === "file" && entry.name.toLowerCase() === fileName.toLowerCase()) ?? false, [listing, fileName]);
  const nameProblem = saving && name !== "" ? (!isValidName(name) ? t(exporting ? "picker.invalidFileName" : "picker.invalidName") : taken && !exporting ? t("picker.exists") : null) : null;
  const replaces = exporting && taken && isValidName(name);
  const canConfirm = listing !== null && (saving ? isValidName(name) && (exporting || !taken) : selected !== null);

  function confirm(): void {
    if (!listing || !canConfirm) return;
    onAnswer(saving ? joinPath(listing.path, fileName) : joinPath(listing.path, selected!));
  }

  async function makeFolder(): Promise<void> {
    if (!listing || folderName === null) return;
    try {
      const path = await api.invoke(IpcChannel.FilesMakeFolder, { parent: listing.path, name: folderName });
      await load(path);
    } catch (e) {
      setError(errorMessage(tRoot, e));
    }
  }

  const title = exporting ? t("picker.exportTitle") : saving ? t("picker.saveTitle") : t("picker.openTitle");
  const placeName = (place: FilePlace) => (place.id === "drive" ? place.path : t(`picker.places.${place.id}`));

  return (
    <Dialog open onOpenChange={(next) => !next && onAnswer(null)}>
      <DialogContent className="flex h-[min(80vh,560px)] flex-col gap-3 sm:max-w-3xl" data-testid="file-picker">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 gap-3">
          <nav aria-label={t("picker.places.label")} className="flex w-40 shrink-0 flex-col gap-0.5 overflow-y-auto border-r pr-3">
            {listing?.places.map((place) => {
              const Icon = PLACE_ICONS[place.id];
              return (
                <button
                  key={place.path}
                  type="button"
                  onClick={() => void load(place.path)}
                  className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted", listing.path === place.path && "bg-muted font-medium")}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{placeName(place)}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon-sm" aria-label={t("picker.up")} title={t("picker.up")} disabled={!listing?.parent} onClick={() => listing?.parent && void load(listing.parent)}>
                <ChevronUpIcon aria-hidden="true" />
              </Button>
              <ol aria-label={t("picker.path")} className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden text-sm">
                {listing &&
                  (() => {
                    // A deep path shows its last three folders, the folder above and the places lead further up
                    const all = crumbsOf(listing.path);
                    const shown = all.slice(-3);
                    return shown.map((crumb, index) => (
                      <li key={crumb.path} className="flex min-w-0 items-center gap-0.5">
                        {(index > 0 || all.length > shown.length) && <span className="text-muted-foreground">/</span>}
                        <button type="button" onClick={() => void load(crumb.path)} className={cn("truncate rounded px-1 hover:bg-muted", index === shown.length - 1 && "font-medium")}>
                          {crumb.name}
                        </button>
                      </li>
                    ));
                  })()}
              </ol>
              <Button type="button" variant="ghost" size="sm" onClick={() => setFolderName("")}>
                <FolderPlusIcon aria-hidden="true" />
                {t("picker.newFolder")}
              </Button>
            </div>

            <ul aria-label={t("picker.list")} className="min-h-0 flex-1 overflow-y-auto rounded-lg border p-1">
              {folderName !== null && (
                <li className="flex items-center gap-2 p-1">
                  <FolderIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <Input
                    autoFocus
                    aria-label={t("picker.folderName")}
                    placeholder={t("picker.folderName")}
                    value={folderName}
                    className="h-7 text-sm md:text-sm"
                    onChange={(event) => setFolderName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void makeFolder();
                      if (event.key === "Escape") {
                        event.stopPropagation();
                        setFolderName(null);
                      }
                    }}
                  />
                  <Button type="button" size="sm" disabled={!isValidName(folderName)} onClick={() => void makeFolder()}>
                    {t("picker.createFolder")}
                  </Button>
                </li>
              )}
              {listing && !listing.readable && <li className="p-3 text-sm text-muted-foreground">{t("picker.unreadable")}</li>}
              {listing && listing.readable && listing.entries.length === 0 && folderName === null && <li className="p-3 text-sm text-muted-foreground">{t("picker.empty")}</li>}
              {listing?.entries.map((entry) => (
                <li key={`${entry.kind}:${entry.name}`}>
                  <button
                    type="button"
                    aria-pressed={entry.kind === "file" ? selected === entry.name : undefined}
                    onClick={() => (entry.kind === "dir" ? void load(joinPath(listing.path, entry.name)) : setSelected(entry.name))}
                    onDoubleClick={() => {
                      if (entry.kind === "file" && !saving) onAnswer(joinPath(listing.path, entry.name));
                    }}
                    className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted", entry.kind === "file" && selected === entry.name && "bg-muted font-medium")}
                  >
                    {entry.kind === "dir" ? <FolderIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : <FileIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                    <span className="truncate">{entry.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {saving && (
          <div className="grid gap-1">
            <div className="flex items-center gap-2">
              <label htmlFor="picker-name" className="shrink-0 text-sm font-medium">
                {t(exporting ? "picker.fileLabel" : "picker.nameLabel")}
              </label>
              <Input
                id="picker-name"
                value={name}
                aria-invalid={nameProblem ? true : undefined}
                className="h-8 text-sm md:text-sm"
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && confirm()}
              />
              <span className="shrink-0 text-sm text-muted-foreground">.{extension}</span>
            </div>
            {nameProblem && (
              <p role="alert" className="text-xs text-destructive">
                <Rich text={nameProblem} />
              </p>
            )}
            {replaces && <p className="text-xs text-muted-foreground">{t("picker.replaces")}</p>}
          </div>
        )}
        {error && (
          <p role="alert" className="text-xs text-destructive select-text">
            <Rich text={error} />
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onAnswer(null)}>
            {t("picker.cancel")}
          </Button>
          <Button type="button" disabled={!canConfirm} onClick={confirm}>
            {exporting ? t("picker.export") : saving ? t("picker.create") : t("picker.open")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

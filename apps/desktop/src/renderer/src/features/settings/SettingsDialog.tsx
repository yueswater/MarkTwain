import { SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ADVANCED_FIELDS } from "@marktwain/schema";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ConfigForm } from "../project/config/ConfigForm";
import { WatermarkSettings } from "./pages/WatermarkSettings";
import { ProfileSettings } from "./pages/ProfileSettings";
import { AdvancedForm, useAdvancedState } from "./pages/AdvancedForm";
import { ListSettings } from "./pages/ListSettings";
import { ShortcutsView } from "../shortcuts/ShortcutsView";
import { EditorAppearanceSettings, EditorPreviewSettings, EditorStatementSettings, EditorWritingSettings } from "./pages/EditorSettings";
import { ThemeSettings } from "./pages/ThemeSettings";
import {
  SETTINGS_PAGES,
  SETTINGS_SECTIONS,
  pageOf,
  searchSettings,
  type SettingsPageId,
} from "./settings-pages";

const LAST_PAGE_KEY = "marktwain.settings.page";

function lastPage(): SettingsPageId | null {
  try {
    const value = localStorage.getItem(LAST_PAGE_KEY);
    return SETTINGS_PAGES.some((page) => page.id === value) ? (value as SettingsPageId) : null;
  } catch {
    return null;
  }
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether a project is open, the thesis pages need one */
  hasProject: boolean;
  /** The page to show when the window opens, for example from a message that names a missing setting */
  initialPage?: SettingsPageId;
  /** Called when something of the thesis was saved, the preview watches it */
  onThesisSaved: () => void;
  /** Called when the text of the documents was changed under the editor, by a new language of the thesis */
  onDocumentsChanged: () => void;
};

/** The settings as a window over the app: sections with their pages on the left, the page on the right. */
export function SettingsDialog({ open, onOpenChange, hasProject, initialPage, onThesisSaved, onDocumentsChanged }: Props) {
  const { t } = useTranslation("settings");
  const { t: tConfig } = useTranslation("config");
  const [pageId, setPageId] = useState<SettingsPageId>(() => initialPage ?? lastPage() ?? (hasProject ? "thesisInfo" : "editorAppearance"));
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState<string | null>(null);
  const advanced = useAdvancedState(open && hasProject, onThesisSaved);
  const page = pageOf(pageId);
  // The rules of the school name the list at the front of the thesis, 目次 or 目錄
  const toc = advanced.state?.terms.toc ?? "目次";

  // Opening the window with a requested page goes there, and without a page that was visited the thesis comes first when a project is open
  useEffect(() => {
    if (!open) return;
    if (initialPage) setPageId(initialPage);
    else if (lastPage() === null) setPageId(hasProject ? "thesisInfo" : "editorAppearance");
  }, [open, initialPage, hasProject]);

  function choose(id: SettingsPageId, row?: string): void {
    setPageId(id);
    setQuery("");
    setHighlight(row ?? null);
    try {
      localStorage.setItem(LAST_PAGE_KEY, id);
    } catch {
      // The choice is only a convenience
    }
  }

  // A search result scrolls to its row and marks it for a moment
  useEffect(() => {
    if (!highlight) return;
    let element: HTMLElement | null = null;
    const timer = setTimeout(() => {
      element = document.getElementById(highlight);
      element?.scrollIntoView({ block: "center" });
      element?.classList.add("settings-flash");
    }, 60);
    const clear = setTimeout(() => setHighlight(null), 2200);
    return () => {
      clearTimeout(timer);
      clearTimeout(clear);
      element?.classList.remove("settings-flash");
    };
  }, [highlight, pageId]);

  const results = useMemo(
    () => searchSettings(
        query,
        (entry) => (entry.ns === "config" ? tConfig(entry.key) : t(entry.key, { toc })),
        (entry) => t(`search.words.${entry.page}`, { toc, defaultValue: "" }),
      ),
    [query, t, tConfig, toc],
  );

  // A page shows a dot when the thesis overrides something of it
  const changed = useMemo(() => {
    const values = advanced.state?.values ?? {};
    return new Set(
      SETTINGS_PAGES.filter((item) =>
        ADVANCED_FIELDS.some((field) => item.groups.includes(field.group) && values[field.path] !== undefined),
      ).map((item) => item.id),
    );
  }, [advanced.state]);

  const title = t(`page.${page.id}.title`, { toc });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="flex h-[min(80vh,720px)] w-[min(92vw,56rem)] max-w-none gap-0 overflow-hidden p-0 sm:max-w-none">
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("description")}</DialogDescription>
        <nav aria-label={t("title")} className="flex w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r bg-muted/30 p-3">
          <p className="px-2 py-1.5 text-sm font-semibold">{t("title")}</p>
          <div className="relative mb-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label={t("search.label")}
              placeholder={t("search.placeholder")}
              value={query}
              spellCheck={false}
              className="h-8 pl-7 text-sm md:text-sm"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {query.trim() !== "" ? (
            <ul aria-label={t("search.results")} className="flex flex-col gap-0.5">
              {results.length === 0 && <li className="px-2 py-1.5 text-xs text-muted-foreground">{t("search.none")}</li>}
              {results.map(({ entry, label }) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => choose(entry.page, entry.id)}
                    className="flex w-full flex-col rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    <span>{label}</span>
                    <span className="text-xs text-muted-foreground">{t(`page.${entry.page}.title`, { toc })}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            SETTINGS_SECTIONS.map((section) => (
              <div key={section} className="mb-2">
                <p className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">{t(`section.${section}`)}</p>
                {SETTINGS_PAGES.filter((item) => item.section === section).map(({ id, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    aria-current={id === pageId ? "page" : undefined}
                    onClick={() => choose(id)}
                    className={cn("flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted", id === pageId && "bg-muted font-medium")}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{t(`page.${id}.title`, { toc })}</span>
                    {changed.has(id) && <span className="size-1.5 shrink-0 rounded-full bg-foreground/60" role="img" aria-label={t("changedDot")} />}
                  </button>
                ))}
              </div>
            ))
          )}
        </nav>
        <section className="min-w-0 flex-1 overflow-y-auto p-6" aria-label={title}>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">{t(`page.${page.id}.description`, { toc })}</p>
          {page.needsProject && !hasProject ? (
            <p className="text-sm text-muted-foreground">{t("noProject")}</p>
          ) : (
            <PageBody pageId={page.id} onThesisSaved={onThesisSaved} onDocumentsChanged={onDocumentsChanged} advanced={advanced} />
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}

function PageBody({ pageId, onThesisSaved, onDocumentsChanged, advanced }: { pageId: SettingsPageId; onThesisSaved: () => void; onDocumentsChanged: () => void; advanced: ReturnType<typeof useAdvancedState> }) {
  const page = pageOf(pageId);
  switch (pageId) {
    case "editorAppearance":
      return <EditorAppearanceSettings />;
    case "editorTheme":
      return <ThemeSettings />;
    case "editorWriting":
      return <EditorWritingSettings />;
    case "editorStatements":
      return <EditorStatementSettings />;
    case "editorPreview":
      return <EditorPreviewSettings />;
    case "editorProfile":
      return <ProfileSettings />;
    case "thesisSchool":
      return (
        <ConfigForm
          embedded
          part="school"
          onLanguageChanged={onDocumentsChanged}
          onSaved={() => {
            onThesisSaved();
            // The school decides what the format settings inherit, the watermark included
            advanced.reload();
          }}
          afterSchool={<WatermarkSettings state={advanced.state} onSave={advanced.save} />}
        />
      );
    case "thesisInfo":
      return <ConfigForm embedded part="info" onSaved={onThesisSaved} />;
    case "editorShortcuts":
      return <ShortcutsView />;
    case "thesisLists":
      return <ListSettings state={advanced.state} onSave={advanced.save} />;
    default:
      return <AdvancedForm groups={page.groups} state={advanced.state} error={advanced.error} onSave={advanced.save} />;
  }
}

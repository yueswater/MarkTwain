import { FileTextIcon, FolderOpenIcon, PlusIcon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RecentProject } from "../../../../../shared/ipc/index";
import { relativeTime } from "./relative-time";

type Props = {
  recent: RecentProject[];
  onCreate: () => void;
  onOpen: () => void;
  onOpenRecent: (path: string) => void;
  onRemoveRecent: (path: string) => void;
};

/** The projects page, shown at startup without a project and after closing one. */
export function WelcomeScreen({ recent, onCreate, onOpen, onOpenRecent, onRemoveRecent }: Props) {
  const { t, i18n } = useTranslation("project");
  const now = Date.now();

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col gap-8 overflow-y-auto p-8">
      <div className={cn("flex flex-col items-center gap-6 text-center", recent.length === 0 ? "my-auto" : "pt-6")}>
        <img src={logo} alt="" className="size-16" />
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">{t("welcome.heading")}</h2>
          <p className="text-sm text-muted-foreground">{t("welcome.description")}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onCreate}>
            <PlusIcon aria-hidden="true" />
            {t("welcome.new")}
          </Button>
          <Button variant="outline" onClick={onOpen}>
            <FolderOpenIcon aria-hidden="true" />
            {t("welcome.open")}
          </Button>
        </div>
      </div>

      {recent.length > 0 && (
        <section aria-label={t("welcome.recent")} className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">{t("welcome.recent")}</h3>
          <ul className="flex flex-col divide-y rounded-lg border">
            {recent.map((project) => (
              <li key={project.path} className="group/row relative">
                <button
                  type="button"
                  disabled={!project.exists}
                  onClick={() => onOpenRecent(project.path)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 pr-10 text-left hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
                >
                  <FileTextIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{project.name}</span>
                    <span className="block truncate text-xs text-muted-foreground" dir="ltr">
                      {project.path}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {project.exists ? relativeTime(project.openedAt, now, i18n.language) : t("welcome.missing")}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`${t("welcome.remove")}: ${project.name}`}
                  title={t("welcome.remove")}
                  className="absolute top-1/2 right-2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
                  onClick={() => onRemoveRecent(project.path)}
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

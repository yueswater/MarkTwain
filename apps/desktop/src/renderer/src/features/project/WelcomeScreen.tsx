import { FolderOpenIcon, PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";

type Props = {
  onCreate: (suggestedName: string) => void;
  onOpen: () => void;
};

export function WelcomeScreen({ onCreate, onOpen }: Props) {
  const { t } = useTranslation("project");

  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-6 p-8 text-center">
      <img src={logo} alt="" className="size-16" />
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">{t("welcome.heading")}</h2>
        <p className="text-sm text-muted-foreground">{t("welcome.description")}</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onCreate(t("welcome.defaultName"))}>
          <PlusIcon aria-hidden="true" />
          {t("welcome.new")}
        </Button>
        <Button variant="outline" onClick={onOpen}>
          <FolderOpenIcon aria-hidden="true" />
          {t("welcome.open")}
        </Button>
      </div>
    </div>
  );
}

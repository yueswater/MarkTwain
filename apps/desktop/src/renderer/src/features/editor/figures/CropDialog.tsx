import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { assetUrl } from "../extensions/nodes/figure";
import { FULL, isFull, moveRect, pixelBox, resizeRect, type Corner, type Rect } from "./crop-geometry";

type Props = {
  src: string;
  /** Called with the PNG bytes of the cropped picture */
  onCrop: (png: Uint8Array) => Promise<void>;
  onClose: () => void;
  onRestoreFocus: () => void;
};

const CORNERS: Corner[] = ["nw", "ne", "sw", "se"];

/** Crops a picture by dragging a rectangle over it. The result is a new picture, the original stays in the project. */
export function CropDialog({ src, onCrop, onClose, onRestoreFocus }: Props) {
  const { t } = useTranslation("editor");
  const [rect, setRect] = useState<Rect>(FULL);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);

  /** Starts dragging the whole rectangle or one corner. */
  function drag(event: ReactPointerEvent<HTMLElement>, corner: Corner | null): void {
    event.preventDefault();
    event.stopPropagation();
    const box = stage.current?.getBoundingClientRect();
    if (!box) return;
    const start = { x: event.clientX, y: event.clientY, rect };
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent) => {
      const dx = (e.clientX - start.x) / box.width;
      const dy = (e.clientY - start.y) / box.height;
      setRect(corner ? resizeRect(start.rect, corner, dx, dy) : moveRect(start.rect, dx, dy));
    };
    const end = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
  }

  async function confirm(): Promise<void> {
    const img = image.current;
    if (!img || isFull(rect)) return onClose();
    setBusy(true);
    setFailed(false);
    try {
      const { sx, sy, sw, sh } = pixelBox(rect, img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      canvas.getContext("2d")?.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("no image");
      await onCrop(new Uint8Array(await blob.arrayBuffer()));
      onClose();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const percent = (v: number) => `${v * 100}%`;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-xl"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRestoreFocus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("crop.title")}</DialogTitle>
          <DialogDescription>{t("crop.hint")}</DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[60vh] justify-center overflow-auto rounded-md border bg-muted/30 p-2">
          <div ref={stage} className="relative inline-block max-w-full select-none" data-testid="crop-stage">
            <img ref={image} src={assetUrl(src)} crossOrigin="anonymous" alt="" draggable={false} className="block max-h-[52vh] max-w-full" />
            {/* The part outside the rectangle is dimmed */}
            <div
              className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
              style={{ left: percent(rect.x), top: percent(rect.y), width: percent(rect.w), height: percent(rect.h) }}
              data-testid="crop-rect"
              onPointerDown={(event) => drag(event, null)}
            >
              {CORNERS.map((corner) => (
                <span
                  key={corner}
                  data-corner={corner}
                  onPointerDown={(event) => drag(event, corner)}
                  className="absolute size-3 rounded-sm border border-foreground bg-white"
                  style={{
                    left: corner.endsWith("w") ? -7 : undefined,
                    right: corner.endsWith("e") ? -7 : undefined,
                    top: corner.startsWith("n") ? -7 : undefined,
                    bottom: corner.startsWith("s") ? -7 : undefined,
                    cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            {t("crop.failed")}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" className="sm:mr-auto" onClick={() => setRect(FULL)} disabled={busy || isFull(rect)}>
            {t("crop.reset")}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("action.cancel", { ns: "common" })}
          </Button>
          <Button type="button" onClick={() => void confirm()} disabled={busy}>
            {t("crop.apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

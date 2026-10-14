import katex from "katex";
import { useTranslation } from "react-i18next";
import type { SlashItem } from "./slash-items";

/** Pieces of the sample code, with the color of each, so the drawing has no loose text in the markup. */
const SAMPLE_CODE: { text: string; color?: string }[][] = [
  [{ text: "def", color: "#d73a49" }, { text: " " }, { text: "mean", color: "#4b69c6" }, { text: "(x):" }],
  [{ text: "    " }, { text: "return", color: "#d73a49" }, { text: " " }, { text: "sum", color: "#b60157" }, { text: "(x) / " }, { text: "len", color: "#b60157" }, { text: "(x)" }],
];
const SAMPLE_CITATION = "(Fu, 2006)";

const SAMPLE_EQUATION = katex.renderToString("E_{\\mathrm{total}} = \\sum_{i=1}^{n} x_i", { displayMode: true, throwOnError: false });
const SAMPLE_INLINE = katex.renderToString("\\rho \\in [0, 1]", { throwOnError: false });

/** A small drawing of what a block looks like, with sample text taken from a thesis. */
export function SlashPreview({ item, level }: { item: SlashItem; level?: number }) {
  const { t } = useTranslation("editor");
  const line = "h-1.5 rounded bg-foreground/15";
  switch (item.preview) {
    case "heading":
      return (
        <div className="space-y-2">
          <p className={["text-2xl", "text-xl", "text-lg", "text-base"][(level ?? 1) - 1] + " font-semibold leading-tight"}>{t("slash.sample.heading")}</p>
          <div className={line} />
          <div className={`${line} w-4/5`} />
        </div>
      );
    case "bullet":
    case "ordered":
      return (
        <ul className="space-y-1.5 text-sm">
          {[0, 1, 2].map((index) => (
            <li key={index} className="flex gap-2">
              <span className="text-muted-foreground">{item.preview === "bullet" ? "•" : `${index + 1}.`}</span>
              <span>{t(`slash.sample.list.${index}`)}</span>
            </li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote className="border-l-4 border-foreground/30 pl-3 text-sm italic text-muted-foreground">{t("slash.sample.quote")}</blockquote>
      );
    case "rule":
      return (
        <div className="space-y-3">
          <div className={line} />
          <hr className="border-foreground/40" />
          <div className={`${line} w-3/5`} />
        </div>
      );
    case "code":
      return (
        <pre className="rounded-md bg-muted p-2 font-mono text-xs leading-5">
          {SAMPLE_CODE.map((row, rowIndex) => (
            <div key={rowIndex}>
              {row.map((piece, pieceIndex) => (
                <span key={pieceIndex} style={piece.color ? { color: piece.color } : undefined}>
                  {piece.text}
                </span>
              ))}
            </div>
          ))}
        </pre>
      );
    case "display":
      return <div className="overflow-hidden text-sm" dangerouslySetInnerHTML={{ __html: SAMPLE_EQUATION }} />;
    case "inline":
      return (
        <p className="text-sm">
          {t("slash.sample.inlineBefore")} <span dangerouslySetInnerHTML={{ __html: SAMPLE_INLINE }} /> {t("slash.sample.inlineAfter")}
        </p>
      );
    case "figure":
      return (
        <figure className="space-y-1.5">
          <div className="flex h-16 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
            <svg viewBox="0 0 80 40" className="h-12 w-full" aria-hidden="true">
              <polyline points="4,34 24,18 40,26 62,6 76,14" fill="none" stroke="currentColor" strokeWidth="2" />
              <line x1="4" y1="36" x2="76" y2="36" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>
          <figcaption className="text-center text-xs text-muted-foreground">{t("slash.sample.figure")}</figcaption>
        </figure>
      );
    case "table":
      return (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-y-2 border-foreground/70">
              <th className="py-1 text-left">{t("slash.sample.tableHead.0")}</th>
              <th className="py-1 text-right">{t("slash.sample.tableHead.1")}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-foreground/40">
              <td className="py-1">{t("slash.sample.tableRow.0")}</td>
              <td className="py-1 text-right tabular-nums">0.42</td>
            </tr>
            <tr className="border-b-2 border-foreground/70">
              <td className="py-1">{t("slash.sample.tableRow.1")}</td>
              <td className="py-1 text-right tabular-nums">0.58</td>
            </tr>
          </tbody>
        </table>
      );
    case "footnote":
      return (
        <p className="text-sm">
          {t("slash.sample.footnote")}
          <sup className="text-[10px]">[1]</sup>
        </p>
      );
    case "citation":
      return <p className="text-sm">{t("slash.sample.citationBefore")} <span className="rounded bg-primary/10 px-1">{SAMPLE_CITATION}</span></p>;
    case "crossRef":
      return <p className="text-sm">{t("slash.sample.crossRefBefore")} <span className="underline decoration-dotted underline-offset-4">{t("slash.sample.crossRefTarget")}</span></p>;
    default:
      return (
        <div className="space-y-2">
          <div className={line} />
          <div className={`${line} w-11/12`} />
          <div className={`${line} w-2/3`} />
        </div>
      );
  }
}

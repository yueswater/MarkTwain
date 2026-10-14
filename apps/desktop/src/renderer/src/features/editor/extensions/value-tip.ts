/** A small label that follows the pointer while something is dragged, showing the value it would take. */
export function createValueTip(doc: Document, testId = "resize-value") {
  const tip = doc.createElement("div");
  tip.setAttribute("aria-live", "polite");
  tip.setAttribute("data-testid", testId);
  tip.className =
    "pointer-events-none fixed z-50 hidden rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md tabular-nums";
  doc.body.appendChild(tip);
  return {
    show(text: string, x: number, y: number) {
      tip.textContent = text;
      tip.classList.remove("hidden");
      tip.style.left = `${x + 14}px`;
      tip.style.top = `${y + 14}px`;
    },
    hide() {
      tip.classList.add("hidden");
    },
    destroy() {
      tip.remove();
    },
  };
}

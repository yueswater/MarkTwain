/** Where a figure or a table floats, picked with icons in the editor and written as placement=top on the figure or the table. */
export const PLACEMENTS = ["auto", "near", "top", "bottom", "page", "here"] as const;

export type Placement = (typeof PLACEMENTS)[number];

export function isPlacement(value: unknown): value is Placement {
  return typeof value === "string" && (PLACEMENTS as readonly string[]).includes(value);
}

/**
 * The placement argument of Typst for each choice, null leaves the figure in the text where it falls.
 * Typst has no near here and no page of its own for floats, so near follows auto and page goes to the top of a page.
 * Another back end keeps its own table, like the letters of the float option in LaTeX.
 */
const TYPST: Record<Placement, string | null> = {
  auto: "auto",
  near: "auto",
  top: "top",
  bottom: "bottom",
  page: "top",
  here: null,
};

export function typstPlacement(placement: Placement): string | null {
  return TYPST[placement];
}

/** The placement of a figure or a table, the one the author wrote or else the default of the thesis. */
export function effectivePlacement(own: string | null | undefined, thesisDefault: Placement): Placement {
  return isPlacement(own) ? own : thesisDefault;
}

/** What floats where when a figure or a table says nothing, the settings of a thesis. A figure floats by default, a long table may not fit a page. */
export const DEFAULT_PLACEMENT = { figure: "auto", table: "here" } as const satisfies Record<string, Placement>;

export function resolvePlacementDefaults(section: unknown): { figure: Placement; table: Placement } {
  const data = (section !== null && typeof section === "object" ? section : {}) as Record<string, unknown>;
  return {
    figure: isPlacement(data.figure) ? data.figure : DEFAULT_PLACEMENT.figure,
    table: isPlacement(data.table) ? data.table : DEFAULT_PLACEMENT.table,
  };
}

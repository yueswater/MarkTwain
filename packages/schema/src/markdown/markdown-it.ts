/// <reference path="./plugins.d.ts" />
import MarkdownIt from "markdown-it";
import attrs from "markdown-it-attrs";
import cjkFriendly from "markdown-it-cjk-friendly";
import footnote from "markdown-it-footnote";
import { citationPlugin } from "./plugins/citation";
import { deflistPlugin } from "./plugins/deflist";
import { divPlugin } from "./plugins/div";
import { figuresPlugin } from "./plugins/figures";
import { footnoteResolvePlugin } from "./plugins/footnote";
import { mathPlugin } from "./plugins/math";
import { tablesPlugin } from "./plugins/tables";

/**
 * The markdown-it instance of the dialect, see section 4.3 of the spec. Later sections add footnotes,
 * definition lists and the hand written plugins here. Raw HTML and auto links are off, content is always text.
 */
export type MarkdownItInstance = InstanceType<typeof MarkdownIt>;

export function createMarkdownIt(): MarkdownItInstance {
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false, breaks: false });
  // Paths and URLs stay as they are, by default non ASCII characters are percent encoded,
  // and image paths in a project must be stored and written back unchanged.
  md.normalizeLink = (url) => url;
  md.normalizeLinkText = (url) => url;

  return md
    .use(cjkFriendly) // Chinese punctuation next to emphasis markers still works, see #71
    .use(attrs)
    .use(footnote)
    .use(deflistPlugin)
    .use(mathPlugin)
    .use(citationPlugin)
    .use(divPlugin)
    .use(footnoteResolvePlugin)
    .use(tablesPlugin)
    .use(figuresPlugin);
}

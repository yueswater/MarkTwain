/** The web addresses that a link may have, the same that the main process opens in the browser. */
const PROTOCOLS = ["http:", "https:", "mailto:"];

/**
 * What the person typed as the address of a link, in a form that is a web address: a word without a protocol gets https in front,
 * and null is returned for what is not one or has a protocol that is not allowed.
 */
export function normalizeUrl(input: string): string | null {
  const text = input.trim();
  if (text === "" || /\s/.test(text)) return null;
  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(text) && !/^[a-z0-9.-]+:\d+(\/|$)/i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withProtocol);
    if (!PROTOCOLS.includes(url.protocol)) return null;
    if (url.protocol !== "mailto:" && !url.hostname.includes(".") && url.hostname !== "localhost") return null;
    return withProtocol;
  } catch {
    return null;
  }
}

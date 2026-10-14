/** OKLCH to sRGB hex, using the OKLab matrices of Björn Ottosson. Channels outside the gamut are clamped to 0 to 255. */
export function oklchToHex(lightness: number, chroma: number, hueDegrees: number): string {
  const hue = (hueDegrees * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);

  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];

  const encode = (value: number): string => {
    const clamped = Math.min(1, Math.max(0, value));
    const gamma = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
    return Math.round(gamma * 255)
      .toString(16)
      .padStart(2, "0");
  };

  return `#${linear.map(encode).join("")}`;
}

const OKLCH = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/;
const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Reads the color tokens of a CSS selector block such as :root or .dark and converts them to hex.
 * Only oklch with L C H and #rrggbb are understood, others such as --radius are ignored.
 */
export function readColorTokens(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const end = css.indexOf("}", start);
  const body = css.slice(start, end);

  const tokens: Record<string, string> = {};
  for (const match of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    const name = match[1] ?? "";
    const value = (match[2] ?? "").trim();
    const oklch = OKLCH.exec(value);
    if (oklch) {
      tokens[name] = oklchToHex(Number(oklch[1]), Number(oklch[2]), Number(oklch[3]));
    } else if (HEX.test(value)) {
      tokens[name] = value.toLowerCase();
    }
  }
  return tokens;
}

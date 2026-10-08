/** Small colour helpers so user-chosen accent colours always stay readable. */

type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
}

/** Linear blend: t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number): string {
  const [x, y] = [hexToRgb(a), hexToRgb(b)];
  return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Black or white, whichever reads better on `bg`. */
export function readableOn(bg: string): string {
  return contrast(bg, "#ffffff") >= contrast(bg, "#1c1917") ? "#ffffff" : "#1c1917";
}

/** Nudges `colour` towards black/white until it has ≥ `min` contrast against `against`. */
export function ensureContrast(colour: string, against: string, min = 4.5): string {
  const target = luminance(against) > 0.4 ? "#000000" : "#ffffff";
  let c = colour;
  for (let i = 0; i < 20 && contrast(c, against) < min; i++) c = mix(c, target, 0.1);
  return c;
}

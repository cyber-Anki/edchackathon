/** Color / type constants mirrored from theme.css — sole JS-side hex source. */

export const colors = {
  bgVoid: "#0A0C0F",
  bgPanel: "#14171C",
  bgPanelRaised: "#1B1F26",
  borderHairline: "#262B33",
  textPrimary: "#E4E7EB",
  textSecondary: "#8A93A1",
  textTertiary: "#5B626E",
  signalTeal: "#4E8C82",
  signalAmber: "#A9744A",
  signalRedMuted: "#8C5450",
} as const;

export const fonts = {
  sans: '"IBM Plex Sans", sans-serif',
  body: "Inter, sans-serif",
  mono: '"IBM Plex Mono", monospace',
} as const;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/** Linear RGB mix between two Section 2.1 tokens (no new hue introduced). */
function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

/** Single-hue sequential colorscale for causal heatmaps: void → teal */
export const tealColorscale: Array<[number, string]> = [
  [0, colors.bgVoid],
  [0.35, mix(colors.bgVoid, colors.signalTeal, 0.35)],
  [0.65, mix(colors.bgVoid, colors.signalTeal, 0.65)],
  [1, colors.signalTeal],
];

export const chartSeries = {
  bdh: colors.signalTeal,
  transformer: colors.signalAmber,
} as const;

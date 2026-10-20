/**
 * Tokens reconstructed from the public cursor/canvas declarations.
 * Text, fill, and stroke alphas follow the mix rules in canvas-tokens.d.ts
 * (dark base #F0F0F0, light base #141414). Chart hexes are copied verbatim.
 * Editor surfaces are not published; these constants are the canvas host fallback.
 */

export type ThemeKind = "dark" | "light";

export type Color =
  | "gray"
  | "purple"
  | "green"
  | "yellow"
  | "cyan"
  | "pink"
  | "blue"
  | "orange"
  | "red";

export type ChartTone = "success" | "danger" | "warning" | "info" | "neutral";

export type CanvasPalette = {
  readonly foreground: string;
  readonly foregroundSecondary: string;
  readonly foregroundTertiary: string;
  readonly foregroundQuaternary: string;
  readonly editor: string;
  readonly chrome: string;
  readonly sidebar: string;
  readonly elevated: string;
  readonly fillPrimary: string;
  readonly fillSecondary: string;
  readonly fillTertiary: string;
  readonly fillQuaternary: string;
  readonly strokePrimary: string;
  readonly strokeSecondary: string;
  readonly strokeTertiary: string;
  readonly strokeFocused: string;
  readonly accent: string;
  readonly buttonBackground: string;
  readonly buttonForeground: string;
  readonly buttonHoverBackground: string;
  readonly link: string;
  readonly diffInsertedLine: string;
  readonly diffRemovedLine: string;
  readonly diffStripAdded: string;
  readonly diffStripRemoved: string;
};

export type CanvasTokens = {
  bg: { editor: string; chrome: string; elevated: string };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    quaternary: string;
    link: string;
    onAccent: string;
  };
  stroke: { primary: string; secondary: string; tertiary: string; focused: string };
  fill: { primary: string; secondary: string; tertiary: string; quaternary: string };
  accent: { primary: string; control: string; controlHover: string };
  diff: {
    insertedLine: string;
    removedLine: string;
    stripAdded: string;
    stripRemoved: string;
  };
  category: Readonly<Record<Color, string>>;
};

export const chartPalette = {
  green: "#1F8A65E8",
  darkGreen: "#0D855AE0",
  lightGreen: "#52B896E0",
  mintGreen: "#7DCAB0E0",
  blue: "#2E79B5E0",
  lightBlue: "#70B0D8E0",
  indigo: "#5A6CC0F0",
  lightIndigo: "#9AAADCE0",
  purple: "#7B64B8F0",
  lightPurple: "#AA98D8E0",
  warmPink: "#C85898E0",
  lightPink: "#E8A0C4E0",
  brightOrange: "#F0A040E0",
  deepOrange: "#C06028E0",
  goldenYellow: "#E8C030E0",
  darkAmber: "#C04848E0",
  warmPeach: "#F0A088E0",
  vibrantTeal: "#2A9A8AE0",
  muted: "#8888A8E0",
  neutralLine: "#888899D0",
} as const;

export const chartColorSequence: readonly string[] = [
  chartPalette.green,
  chartPalette.blue,
  chartPalette.purple,
  chartPalette.brightOrange,
  chartPalette.lightBlue,
  chartPalette.warmPink,
  chartPalette.goldenYellow,
  chartPalette.vibrantTeal,
  chartPalette.indigo,
  chartPalette.deepOrange,
];

export const toneColor: Record<ChartTone, string> = {
  success: "#1F8A65",
  danger: "#C04848",
  warning: "#C06028",
  info: "#2E79B5",
  neutral: "#888899",
};

const categoryDark: Record<Color, string> = {
  gray: "#F0F0F099",
  purple: "#7B64B8",
  green: "#1F8A65",
  yellow: "#E8C030",
  cyan: "#2A9A8A",
  pink: "#C85898",
  blue: "#2E79B5",
  orange: "#F0A040",
  red: "#C04848",
};

const categoryLight: Record<Color, string> = {
  gray: "#14141499",
  purple: "#6A54A8",
  green: "#1A7A58",
  yellow: "#8A6A10",
  cyan: "#1E7A6C",
  pink: "#A84880",
  blue: "#2E79B5",
  orange: "#C06028",
  red: "#A83838",
};

export const usageColorSequence: readonly Color[] = [
  "purple",
  "green",
  "yellow",
  "blue",
  "orange",
  "pink",
  "cyan",
  "red",
  "gray",
];

function mix(base: string, percent: number): string {
  const alpha = Math.round((percent / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${base}${alpha}`;
}

function palette(kind: ThemeKind): CanvasPalette {
  const dark = kind === "dark";
  const ink = dark ? "#F0F0F0" : "#141414";
  const editor = dark ? "#181818" : "#FCFCFC";
  const chrome = dark ? "#141414" : "#F3F3F3";
  const accent = dark ? "#70B0D8" : "#2E79B5";
  return {
    foreground: ink,
    foregroundSecondary: mix(ink, 74),
    foregroundTertiary: mix(ink, 60),
    foregroundQuaternary: mix(ink, 36),
    editor,
    chrome,
    sidebar: chrome,
    elevated: editor,
    fillPrimary: mix(ink, 20),
    fillSecondary: mix(ink, 14),
    fillTertiary: mix(ink, 8),
    fillQuaternary: mix(ink, 6),
    strokePrimary: mix(ink, 20),
    strokeSecondary: mix(ink, 12),
    strokeTertiary: mix(ink, 8),
    strokeFocused: accent,
    accent,
    buttonBackground: accent,
    buttonForeground: dark ? "#141414" : "#FCFCFC",
    buttonHoverBackground: dark ? "#8EC0E4" : "#24689F",
    link: accent,
    diffInsertedLine: dark ? "#1F8A652E" : "#1F8A6524",
    diffRemovedLine: dark ? "#C048482E" : "#C0484824",
    diffStripAdded: "#1F8A65",
    diffStripRemoved: "#C04848",
  };
}

export function buildTheme(kind: ThemeKind) {
  const p = palette(kind);
  const category = kind === "dark" ? categoryDark : categoryLight;
  const tokens: CanvasTokens = {
    bg: { editor: p.editor, chrome: p.chrome, elevated: p.elevated },
    text: {
      primary: p.foreground,
      secondary: p.foregroundSecondary,
      tertiary: p.foregroundTertiary,
      quaternary: p.foregroundQuaternary,
      link: p.link,
      onAccent: p.buttonForeground,
    },
    stroke: {
      primary: p.strokePrimary,
      secondary: p.strokeSecondary,
      tertiary: p.strokeTertiary,
      focused: p.strokeFocused,
    },
    fill: {
      primary: p.fillPrimary,
      secondary: p.fillSecondary,
      tertiary: p.fillTertiary,
      quaternary: p.fillQuaternary,
    },
    accent: {
      primary: p.accent,
      control: p.buttonBackground,
      controlHover: p.buttonHoverBackground,
    },
    diff: {
      insertedLine: p.diffInsertedLine,
      removedLine: p.diffRemovedLine,
      stripAdded: p.diffStripAdded,
      stripRemoved: p.diffStripRemoved,
    },
    category,
  };
  return {
    kind,
    ...tokens,
    tokens,
    palette: p,
    category,
  };
}

export const canvasPaletteDark = palette("dark");
export const canvasPaletteLight = palette("light");
export const canvasTokens = buildTheme("dark").tokens;
export const canvasTokensLight = buildTheme("light").tokens;
export const categoryPaletteDark = categoryDark;
export const categoryPaletteLight = categoryLight;
export const colorPalette = categoryDark;

export const canvasTypography = {
  h1: { fontSize: "24px", lineHeight: "30px", fontWeight: 590 },
  h2: { fontSize: "18px", lineHeight: "24px", fontWeight: 590 },
  h3: { fontSize: "16px", lineHeight: "22px", fontWeight: 590 },
  body: { fontSize: "14px", lineHeight: "20px", fontWeight: 400 },
  small: { fontSize: "12px", lineHeight: "16px", fontWeight: 400 },
} as const;

export const fontStack =
  '"Segoe UI Variable", "Segoe UI", system-ui, sans-serif';
export const monoStack =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

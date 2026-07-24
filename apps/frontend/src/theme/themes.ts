import { createTheme  } from "@mantine/core";
import type {MantineColorsTuple, MantineThemeOverride } from "@mantine/core";

/**
 * Theme system — VSCode-style.
 *
 * Each entry in THEMES is a small, readable set of plain values (a ground
 * colour, an accent, a couple of fonts, a corner style). `buildMantineTheme`
 * is the *only* place that turns those values into a full Mantine theme, so
 * adding a new theme means writing ~10 lines of values, not hand-tuning a
 * 10-colour palette.
 *
 * Each theme commits to its own light/dark ground (like picking "Monokai" vs
 * "Solarized Light" in an editor) — we don't auto-invert. That's what keeps
 * every theme feeling deliberately designed instead of machine-generated.
 */

export type ThemeId =
  | "classic"
  | "reel"
  | "almanac"
  | "terminal"
  | "nightshift"
  | "obsidian"
  | "overcast";

interface ThemeDef {
  id: ThemeId;
  label: string;
  /** One-line vibe, shown in the switcher. */
  blurb: string;
  scheme: "light" | "dark";
  /** The main brand/accent colour (buttons, links, active states). */
  accent: string;
  /** Page background — the "ground" everything sits on. */
  bg: string;
  /** Card / input surface, lifted slightly off the ground. */
  surface: string;
  /** Primary text colour. */
  text: string;
  /** Font stack for headings + body. Web-safe stacks: zero downloads. */
  fontHeading: string;
  fontBody: string;
  fontMono: string;
  /** Default corner radius — part of each theme's personality. */
  radius: "xs" | "sm" | "md" | "lg";
}

// ---------------------------------------------------------------------------
// Font stacks — chosen for real contrast between themes, all system-available.
// ---------------------------------------------------------------------------
// Self-hosted book serif (see main.tsx). Designed for screens, so it stays
// crisp at small sizes where OS print-serifs like Palatino look pixelated.
const BOOK_SERIF = '"Lora Variable", Georgia, "Times New Roman", serif';
const SANS =
  '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
const MONO =
  '"Cascadia Code", "JetBrains Mono", "SF Mono", Consolas, "Liberation Mono", monospace';

// ---------------------------------------------------------------------------
// The themes. Keep these small and legible — the builder does the heavy work.
// ---------------------------------------------------------------------------
export const THEMES: Record<ThemeId, ThemeDef> = {
  classic: {
    id: "classic",
    label: "Classic",
    blurb: "The original — clean indigo on white",
    scheme: "light",
    accent: "#4c6ef5",
    bg: "#f8f9fa",
    surface: "#ffffff",
    text: "#1a1b1e",
    fontHeading: SANS,
    fontBody: SANS,
    fontMono: MONO,
    radius: "md",
  },
  reel: {
    id: "reel",
    label: "Reel",
    blurb: "Cinematic noir — gold on ink",
    scheme: "dark",
    accent: "#e7b45a",
    bg: "#0c0c0f",
    surface: "#17161c",
    text: "#f2eee6",
    fontHeading: BOOK_SERIF,
    fontBody: SANS,
    fontMono: MONO,
    radius: "md",
  },
  almanac: {
    id: "almanac",
    label: "Almanac",
    blurb: "Warm paper and ink — a reading room",
    scheme: "light",
    accent: "#9a5b34",
    bg: "#f4efe3",
    surface: "#fbf8f1",
    text: "#2c2620",
    fontHeading: BOOK_SERIF,
    fontBody: BOOK_SERIF,
    fontMono: MONO,
    radius: "sm",
  },
  terminal: {
    id: "terminal",
    label: "Terminal",
    blurb: "Monospace, high-contrast, all business",
    scheme: "dark",
    accent: "#3ddc84",
    bg: "#0a0e0c",
    surface: "#111815",
    text: "#d6f5e3",
    fontHeading: MONO,
    fontBody: MONO,
    fontMono: MONO,
    radius: "xs",
  },
  nightshift: {
    id: "nightshift",
    label: "Nightshift",
    blurb: "Clean modern dark, one cool accent",
    scheme: "dark",
    accent: "#5b8def",
    bg: "#101216",
    surface: "#191c22",
    text: "#e6e9ef",
    fontHeading: SANS,
    fontBody: SANS,
    fontMono: MONO,
    radius: "lg",
  },
  obsidian: {
    id: "obsidian",
    label: "Obsidian",
    blurb: "True black, OLED-friendly monochrome",
    scheme: "dark",
    accent: "#ececec",
    bg: "#000000",
    surface: "#101012",
    text: "#f4f4f5",
    fontHeading: SANS,
    fontBody: SANS,
    fontMono: MONO,
    radius: "md",
  },
  overcast: {
    id: "overcast",
    label: "Overcast",
    blurb: "Soft light grey, cool and calm",
    scheme: "light",
    accent: "#4a5b70",
    bg: "#e8eaed",
    surface: "#ffffff",
    text: "#23262b",
    fontHeading: SANS,
    fontBody: SANS,
    fontMono: MONO,
    radius: "md",
  },
};

export const THEME_ORDER: ThemeId[] = [
  "classic",
  "reel",
  "almanac",
  "terminal",
  "nightshift",
  "obsidian",
  "overcast",
];

export const DEFAULT_THEME: ThemeId = "almanac";

// ---------------------------------------------------------------------------
// Tiny colour helpers (no dependency needed).
// ---------------------------------------------------------------------------
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Blend two hex colours. t=0 → a, t=1 → b. */
function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t,
  );
}

const WHITE = "#ffffff";
const BLACK = "#000000";

/**
 * Build a 10-shade Mantine tuple from a single accent colour.
 * Index 6 is the accent itself (Mantine's default "filled" shade); lighter
 * shades run 5→0, darker shades run 7→9.
 */
function accentTuple(base: string): MantineColorsTuple {
  return [
    mix(base, WHITE, 0.82),
    mix(base, WHITE, 0.64),
    mix(base, WHITE, 0.46),
    mix(base, WHITE, 0.28),
    mix(base, WHITE, 0.12),
    mix(base, WHITE, 0.04),
    base,
    mix(base, BLACK, 0.18),
    mix(base, BLACK, 0.34),
    mix(base, BLACK, 0.5),
  ] as unknown as MantineColorsTuple;
}

/**
 * Build the neutral "dark" tuple that drives backgrounds, surfaces, borders
 * and text for a dark theme. Mantine reads specific indices:
 *   [0] text · [2] dimmed text · [4] border · [5] hover · [6] surface · [7] body
 */
function darkTuple(def: ThemeDef): MantineColorsTuple {
  const { bg, surface, text } = def;
  return [
    text, // 0 — primary text
    mix(text, bg, 0.15), // 1
    mix(text, bg, 0.42), // 2 — dimmed text
    mix(text, bg, 0.6), // 3
    mix(surface, text, 0.16), // 4 — borders
    mix(surface, text, 0.08), // 5 — hover
    surface, // 6 — card / input surface
    bg, // 7 — page background
    mix(bg, BLACK, 0.4), // 8
    mix(bg, BLACK, 0.6), // 9
  ] as unknown as MantineColorsTuple;
}

/** Warm/cool neutral gray tuple for light themes, biased toward the ground. */
function grayTuple(def: ThemeDef): MantineColorsTuple {
  const { text } = def;
  return [
    mix(WHITE, text, 0.03),
    mix(WHITE, text, 0.07),
    mix(WHITE, text, 0.14),
    mix(WHITE, text, 0.24),
    mix(WHITE, text, 0.38),
    mix(WHITE, text, 0.52),
    mix(WHITE, text, 0.66),
    mix(WHITE, text, 0.78),
    mix(WHITE, text, 0.88),
    text,
  ] as unknown as MantineColorsTuple;
}

/**
 * Expand a ThemeDef into a full Mantine theme override. This is the single
 * source of truth for how a theme's plain values become Mantine config.
 */
export function buildMantineTheme(def: ThemeDef): MantineThemeOverride {
  const isDark = def.scheme === "dark";

  const colors: Record<string, MantineColorsTuple> = {
    accent: accentTuple(def.accent),
  };

  if (isDark) {
    colors.dark = darkTuple(def);
  } else {
    colors.gray = grayTuple(def);
  }

  return createTheme({
    primaryColor: "accent",
    // Use a mid shade so the accent reads the same on light and dark grounds.
    primaryShade: { light: 6, dark: 6 },

    white: def.surface,
    black: def.text,
    colors,

    fontFamily: def.fontBody,
    fontFamilyMonospace: def.fontMono,
    headings: { fontFamily: def.fontHeading },

    defaultRadius: def.radius,
    radius: {
      xs: "4px",
      sm: "8px",
      md: "12px",
      lg: "16px",
      xl: "22px",
    },

    spacing: {
      xs: "6px",
      sm: "10px",
      md: "16px",
      lg: "24px",
      xl: "32px",
    },

    shadows: {
      xs: "0 1px 2px rgba(0,0,0,.18)",
      sm: "0 2px 8px rgba(0,0,0,.20)",
      md: "0 4px 14px rgba(0,0,0,.24)",
      lg: "0 10px 30px rgba(0,0,0,.30)",
    },

    components: {
      Checkbox: { defaultProps: { radius: "xs" } },
    },
  });
}

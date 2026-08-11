/** Curated typefaces for Atrium — UI + display. Google fonts load on demand. */

export type FontSource = "bundled" | "system" | "google";

export type AppFont = {
  id: string;
  name: string;
  /** CSS font-family stack */
  stack: string;
  source: FontSource;
  /** Google Fonts family name when source is google */
  googleFamily?: string;
  kind: "sans" | "serif" | "display" | "mono";
};

export const APP_FONTS: AppFont[] = [
  // Bundled defaults
  {
    id: "dm-sans",
    name: "DM Sans",
    stack: '"DM Sans Variable", "Segoe UI", sans-serif',
    source: "bundled",
    kind: "sans",
  },
  {
    id: "fraunces",
    name: "Fraunces",
    stack: '"Fraunces Variable", Georgia, serif',
    source: "bundled",
    kind: "serif",
  },

  // System
  {
    id: "system-ui",
    name: "System UI",
    stack: 'system-ui, "Segoe UI", sans-serif',
    source: "system",
    kind: "sans",
  },
  {
    id: "segoe-ui",
    name: "Segoe UI",
    stack: '"Segoe UI", system-ui, sans-serif',
    source: "system",
    kind: "sans",
  },
  {
    id: "arial",
    name: "Arial",
    stack: "Arial, Helvetica, sans-serif",
    source: "system",
    kind: "sans",
  },
  {
    id: "verdana",
    name: "Verdana",
    stack: "Verdana, Geneva, sans-serif",
    source: "system",
    kind: "sans",
  },
  {
    id: "trebuchet",
    name: "Trebuchet MS",
    stack: '"Trebuchet MS", "Segoe UI", sans-serif',
    source: "system",
    kind: "sans",
  },
  {
    id: "georgia",
    name: "Georgia",
    stack: 'Georgia, "Times New Roman", serif',
    source: "system",
    kind: "serif",
  },
  {
    id: "times",
    name: "Times New Roman",
    stack: '"Times New Roman", Times, serif',
    source: "system",
    kind: "serif",
  },
  {
    id: "palatino",
    name: "Palatino",
    stack: 'Palatino, "Palatino Linotype", "Book Antiqua", serif',
    source: "system",
    kind: "serif",
  },
  {
    id: "consolas",
    name: "Consolas",
    stack: 'Consolas, "Courier New", monospace',
    source: "system",
    kind: "mono",
  },
  {
    id: "courier",
    name: "Courier New",
    stack: '"Courier New", Courier, monospace',
    source: "system",
    kind: "mono",
  },

  // Google — sans
  { id: "inter", name: "Inter", stack: '"Inter", system-ui, sans-serif', source: "google", googleFamily: "Inter", kind: "sans" },
  { id: "roboto", name: "Roboto", stack: '"Roboto", system-ui, sans-serif', source: "google", googleFamily: "Roboto", kind: "sans" },
  { id: "open-sans", name: "Open Sans", stack: '"Open Sans", system-ui, sans-serif', source: "google", googleFamily: "Open Sans", kind: "sans" },
  { id: "lato", name: "Lato", stack: '"Lato", system-ui, sans-serif', source: "google", googleFamily: "Lato", kind: "sans" },
  { id: "montserrat", name: "Montserrat", stack: '"Montserrat", system-ui, sans-serif', source: "google", googleFamily: "Montserrat", kind: "sans" },
  { id: "poppins", name: "Poppins", stack: '"Poppins", system-ui, sans-serif', source: "google", googleFamily: "Poppins", kind: "sans" },
  { id: "nunito", name: "Nunito", stack: '"Nunito", system-ui, sans-serif', source: "google", googleFamily: "Nunito", kind: "sans" },
  { id: "raleway", name: "Raleway", stack: '"Raleway", system-ui, sans-serif', source: "google", googleFamily: "Raleway", kind: "sans" },
  { id: "source-sans-3", name: "Source Sans 3", stack: '"Source Sans 3", system-ui, sans-serif', source: "google", googleFamily: "Source Sans 3", kind: "sans" },
  { id: "work-sans", name: "Work Sans", stack: '"Work Sans", system-ui, sans-serif', source: "google", googleFamily: "Work Sans", kind: "sans" },
  { id: "outfit", name: "Outfit", stack: '"Outfit", system-ui, sans-serif', source: "google", googleFamily: "Outfit", kind: "sans" },
  { id: "manrope", name: "Manrope", stack: '"Manrope", system-ui, sans-serif', source: "google", googleFamily: "Manrope", kind: "sans" },
  { id: "plus-jakarta", name: "Plus Jakarta Sans", stack: '"Plus Jakarta Sans", system-ui, sans-serif', source: "google", googleFamily: "Plus Jakarta Sans", kind: "sans" },
  { id: "space-grotesk", name: "Space Grotesk", stack: '"Space Grotesk", system-ui, sans-serif', source: "google", googleFamily: "Space Grotesk", kind: "sans" },
  { id: "ibm-plex-sans", name: "IBM Plex Sans", stack: '"IBM Plex Sans", system-ui, sans-serif', source: "google", googleFamily: "IBM Plex Sans", kind: "sans" },
  { id: "figtree", name: "Figtree", stack: '"Figtree", system-ui, sans-serif', source: "google", googleFamily: "Figtree", kind: "sans" },
  { id: "sora", name: "Sora", stack: '"Sora", system-ui, sans-serif', source: "google", googleFamily: "Sora", kind: "sans" },
  { id: "urbanist", name: "Urbanist", stack: '"Urbanist", system-ui, sans-serif', source: "google", googleFamily: "Urbanist", kind: "sans" },
  { id: "lexend", name: "Lexend", stack: '"Lexend", system-ui, sans-serif', source: "google", googleFamily: "Lexend", kind: "sans" },
  { id: "atkinson", name: "Atkinson Hyperlegible", stack: '"Atkinson Hyperlegible", system-ui, sans-serif', source: "google", googleFamily: "Atkinson Hyperlegible", kind: "sans" },
  { id: "rubik", name: "Rubik", stack: '"Rubik", system-ui, sans-serif', source: "google", googleFamily: "Rubik", kind: "sans" },
  { id: "mulish", name: "Mulish", stack: '"Mulish", system-ui, sans-serif', source: "google", googleFamily: "Mulish", kind: "sans" },
  { id: "archivo", name: "Archivo", stack: '"Archivo", system-ui, sans-serif', source: "google", googleFamily: "Archivo", kind: "sans" },
  { id: "red-hat-display", name: "Red Hat Display", stack: '"Red Hat Display", system-ui, sans-serif', source: "google", googleFamily: "Red Hat Display", kind: "sans" },
  { id: "josefin-sans", name: "Josefin Sans", stack: '"Josefin Sans", system-ui, sans-serif', source: "google", googleFamily: "Josefin Sans", kind: "sans" },
  { id: "quicksand", name: "Quicksand", stack: '"Quicksand", system-ui, sans-serif', source: "google", googleFamily: "Quicksand", kind: "sans" },
  { id: "comfortaa", name: "Comfortaa", stack: '"Comfortaa", system-ui, sans-serif', source: "google", googleFamily: "Comfortaa", kind: "sans" },
  { id: "fredoka", name: "Fredoka", stack: '"Fredoka", system-ui, sans-serif', source: "google", googleFamily: "Fredoka", kind: "sans" },
  { id: "oswald", name: "Oswald", stack: '"Oswald", system-ui, sans-serif', source: "google", googleFamily: "Oswald", kind: "display" },
  { id: "bebas-neue", name: "Bebas Neue", stack: '"Bebas Neue", system-ui, sans-serif', source: "google", googleFamily: "Bebas Neue", kind: "display" },
  { id: "barlow", name: "Barlow", stack: '"Barlow", system-ui, sans-serif', source: "google", googleFamily: "Barlow", kind: "sans" },
  { id: "cabin", name: "Cabin", stack: '"Cabin", system-ui, sans-serif', source: "google", googleFamily: "Cabin", kind: "sans" },
  { id: "karla", name: "Karla", stack: '"Karla", system-ui, sans-serif', source: "google", googleFamily: "Karla", kind: "sans" },
  { id: "exo-2", name: "Exo 2", stack: '"Exo 2", system-ui, sans-serif', source: "google", googleFamily: "Exo 2", kind: "sans" },
  { id: "titillium", name: "Titillium Web", stack: '"Titillium Web", system-ui, sans-serif', source: "google", googleFamily: "Titillium Web", kind: "sans" },
  { id: "noto-sans", name: "Noto Sans", stack: '"Noto Sans", system-ui, sans-serif', source: "google", googleFamily: "Noto Sans", kind: "sans" },

  // Google — serif / display
  { id: "merriweather", name: "Merriweather", stack: '"Merriweather", Georgia, serif', source: "google", googleFamily: "Merriweather", kind: "serif" },
  { id: "playfair", name: "Playfair Display", stack: '"Playfair Display", Georgia, serif', source: "google", googleFamily: "Playfair Display", kind: "serif" },
  { id: "lora", name: "Lora", stack: '"Lora", Georgia, serif', source: "google", googleFamily: "Lora", kind: "serif" },
  { id: "libre-baskerville", name: "Libre Baskerville", stack: '"Libre Baskerville", Georgia, serif', source: "google", googleFamily: "Libre Baskerville", kind: "serif" },
  { id: "cormorant", name: "Cormorant Garamond", stack: '"Cormorant Garamond", Georgia, serif', source: "google", googleFamily: "Cormorant Garamond", kind: "serif" },
  { id: "crimson-pro", name: "Crimson Pro", stack: '"Crimson Pro", Georgia, serif', source: "google", googleFamily: "Crimson Pro", kind: "serif" },
  { id: "spectral", name: "Spectral", stack: '"Spectral", Georgia, serif', source: "google", googleFamily: "Spectral", kind: "serif" },
  { id: "literata", name: "Literata", stack: '"Literata", Georgia, serif', source: "google", googleFamily: "Literata", kind: "serif" },
  { id: "instrument-serif", name: "Instrument Serif", stack: '"Instrument Serif", Georgia, serif', source: "google", googleFamily: "Instrument Serif", kind: "serif" },
  { id: "instrument-sans", name: "Instrument Sans", stack: '"Instrument Sans", system-ui, sans-serif', source: "google", googleFamily: "Instrument Sans", kind: "sans" },
  { id: "newsreader", name: "Newsreader", stack: '"Newsreader", Georgia, serif', source: "google", googleFamily: "Newsreader", kind: "serif" },
  { id: "bitter", name: "Bitter", stack: '"Bitter", Georgia, serif', source: "google", googleFamily: "Bitter", kind: "serif" },
  { id: "ibm-plex-serif", name: "IBM Plex Serif", stack: '"IBM Plex Serif", Georgia, serif', source: "google", googleFamily: "IBM Plex Serif", kind: "serif" },
  { id: "source-serif-4", name: "Source Serif 4", stack: '"Source Serif 4", Georgia, serif', source: "google", googleFamily: "Source Serif 4", kind: "serif" },
  { id: "cardo", name: "Cardo", stack: '"Cardo", Georgia, serif', source: "google", googleFamily: "Cardo", kind: "serif" },
  { id: "eb-garamond", name: "EB Garamond", stack: '"EB Garamond", Georgia, serif', source: "google", googleFamily: "EB Garamond", kind: "serif" },
  { id: "noto-serif", name: "Noto Serif", stack: '"Noto Serif", Georgia, serif', source: "google", googleFamily: "Noto Serif", kind: "serif" },

  // Google — mono
  { id: "jetbrains-mono", name: "JetBrains Mono", stack: '"JetBrains Mono", Consolas, monospace', source: "google", googleFamily: "JetBrains Mono", kind: "mono" },
  { id: "fira-code", name: "Fira Code", stack: '"Fira Code", Consolas, monospace', source: "google", googleFamily: "Fira Code", kind: "mono" },
  { id: "source-code-pro", name: "Source Code Pro", stack: '"Source Code Pro", Consolas, monospace', source: "google", googleFamily: "Source Code Pro", kind: "mono" },
  { id: "ibm-plex-mono", name: "IBM Plex Mono", stack: '"IBM Plex Mono", Consolas, monospace', source: "google", googleFamily: "IBM Plex Mono", kind: "mono" },
  { id: "inconsolata", name: "Inconsolata", stack: '"Inconsolata", Consolas, monospace', source: "google", googleFamily: "Inconsolata", kind: "mono" },
  { id: "space-mono", name: "Space Mono", stack: '"Space Mono", Consolas, monospace', source: "google", googleFamily: "Space Mono", kind: "mono" },
  { id: "recursive", name: "Recursive", stack: '"Recursive", system-ui, sans-serif', source: "google", googleFamily: "Recursive", kind: "sans" },
];

export const DEFAULT_UI_FONT_ID = "dm-sans";
export const DEFAULT_HEADING_FONT_ID = "fraunces";

export function getFontById(id: string): AppFont | undefined {
  return APP_FONTS.find((font) => font.id === id);
}

export function resolveFont(id: string, fallbackId: string): AppFont {
  return getFontById(id) ?? getFontById(fallbackId) ?? APP_FONTS[0]!;
}

const loadedGoogleFonts = new Set<string>();

/** Inject a Google Fonts stylesheet once per family. */
export function ensureFontLoaded(font: AppFont): void {
  if (font.source !== "google" || !font.googleFamily) return;
  if (typeof document === "undefined") return;
  if (loadedGoogleFonts.has(font.id)) return;
  loadedGoogleFonts.add(font.id);

  const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.googleFamily)}:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap`;
  const existing = document.querySelector(`link[data-atrium-font="${font.id}"]`);
  if (existing) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.atriumFont = font.id;
  document.head.appendChild(link);
}

export function applyAppFonts(uiFontId: string, headingFontId: string): void {
  if (typeof document === "undefined") return;
  const ui = resolveFont(uiFontId, DEFAULT_UI_FONT_ID);
  const heading = resolveFont(headingFontId, DEFAULT_HEADING_FONT_ID);
  ensureFontLoaded(ui);
  ensureFontLoaded(heading);
  const root = document.documentElement;
  root.style.setProperty("--font-family", ui.stack);
  root.style.setProperty("--font-ui", ui.stack);
  root.style.setProperty("--font-heading", heading.stack);
  root.dataset.uiFont = ui.id;
  root.dataset.headingFont = heading.id;
}

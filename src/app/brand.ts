/**
 * Centralized product identity.
 * Visual mark: `src/assets/atrium-logo.png` (also `docs/brand/` for README).
 * Rename here (and in package/Cargo/tauri config) when the final name is chosen.
 */
export const APP_NAME = "Atrium";
export const APP_ID = "com.atrium.player";
export const APP_DESCRIPTION =
  "An offline-first personal music environment for local libraries.";
export const THEME_FILE_KIND = "atrium-theme";
export const THEME_FILE_EXTENSION = "atrium-theme.json";
export const THEME_SCHEMA_VERSION = 1;

/** Public GitHub project — used in Settings → About. */
export const APP_GITHUB_URL = "https://github.com/Salutatorian/atrium";
export const APP_GITHUB_ISSUES_URL =
  "https://github.com/Salutatorian/atrium/issues/new";

/** Stripe Payment Links (USD) — tip buttons open these in the system browser. */
export const DONATE_LINKS = {
  usd1: "https://donate.stripe.com/eVq7sM9CF6MS01H7rj5AQ03",
  usd3: "https://donate.stripe.com/9B6bJ24ilefkcOth1T5AQ04",
  usd5: "https://donate.stripe.com/aFa14ocORefk9Chh1T5AQ05",
} as const;

export const DONATE_AMOUNTS = [
  {
    id: "usd1",
    label: "Donate $1",
    tooltip: "Opens Stripe donation checkout for US$1",
    url: DONATE_LINKS.usd1,
  },
  {
    id: "usd3",
    label: "Donate $3",
    tooltip: "Opens Stripe donation checkout for US$3",
    url: DONATE_LINKS.usd3,
  },
  {
    id: "usd5",
    label: "Donate $5",
    tooltip: "Opens Stripe donation checkout for US$5",
    url: DONATE_LINKS.usd5,
  },
] as const;

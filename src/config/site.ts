/**
 * Single place to rename / re-brand the product.
 * Change `name`, `domain`, `colors`, `languages` or `pricing` here only.
 */

export type Lang = "en" | "si" | "ta";
export type PlanKey = "free" | "standard" | "premium";

export const siteConfig = {
  /** Working name – shown in the header, footer, OG images and "Made with" badge. */
  name: "Occasions",
  /** Public origin; override with NEXT_PUBLIC_SITE_URL in production. */
  domain: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /** Brand colours – injected as CSS variables in the root layout. */
  colors: {
    brand: "#9a3412",
    brandDark: "#7c2d12",
    brandSoft: "#fff1e6",
    ink: "#1c1917",
    paper: "#fffaf5",
  },
  languages: [
    { code: "en", label: "English", short: "EN" },
    { code: "si", label: "සිංහල", short: "සිං" },
    { code: "ta", label: "தமிழ்", short: "த" },
  ] as const satisfies ReadonlyArray<{ code: Lang; label: string; short: string }>,
  defaultLanguage: "en" as Lang,
  /** Cookie that stores the visitor's chosen language. */
  languageCookie: "lang",
  /** Placeholder prices (LKR / one event). Edit freely. */
  pricing: {
    currency: "LKR",
    plans: [
      { key: "free", price: 0 },
      { key: "standard", price: 1500 },
      { key: "premium", price: 3500 },
    ] as ReadonlyArray<{ key: PlanKey; price: number }>,
  },
  /** URL slugs that cannot be used for events. */
  reservedSlugs: ["demo", "dashboard", "login", "auth", "api", "e", "new", "admin"],
} as const;

export const LANG_CODES: Lang[] = siteConfig.languages.map((l) => l.code);

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (LANG_CODES as string[]).includes(v);
}

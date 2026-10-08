import { isLang, siteConfig, type Lang } from "@/config/site";

import enCommon from "./messages/en/common.json";
import siCommon from "./messages/si/common.json";
import taCommon from "./messages/ta/common.json";

/**
 * To add a language: create messages/<code>/*.json, register it below and add it to
 * `siteConfig.languages`. Missing keys fall back to English automatically.
 */
const en = { common: enCommon };
export type Dict = typeof en;

type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> };

const bundles: Record<Lang, DeepPartial<Dict>> = {
  en,
  si: { common: siCommon },
  ta: { common: taCommon },
};

function merge<T>(base: T, over: DeepPartial<T> | undefined): T {
  if (!over || typeof base !== "object" || base === null) return (over as T) ?? base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over)) {
    const b = (base as Record<string, unknown>)[k];
    out[k] = v && typeof v === "object" && typeof b === "object" ? merge(b, v as never) : (v ?? b);
  }
  return out as T;
}

const cache = new Map<Lang, Dict>();

/** Full dictionary for a language (English fills any gaps). Server-side only. */
export function getDict(lang: Lang): Dict {
  let d = cache.get(lang);
  if (!d) {
    d = lang === "en" ? en : merge(en, bundles[lang]);
    cache.set(lang, d);
  }
  return d;
}

/** Replace `{name}` placeholders. */
export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

export function normaliseLang(value: string | undefined | null, fallback?: Lang): Lang {
  return isLang(value) ? value : (fallback ?? siteConfig.defaultLanguage);
}

/** BCP-47 locale used for date formatting. */
export const LOCALES: Record<Lang, string> = { en: "en-LK", si: "si-LK", ta: "ta-LK" };

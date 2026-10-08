import { cookies } from "next/headers";
import { siteConfig, type Lang } from "@/config/site";
import { getDict, normaliseLang, type Dict } from "./index";

/** Visitor's language: cookie → `fallback` → site default. */
export async function getLang(fallback?: Lang): Promise<Lang> {
  const store = await cookies();
  return normaliseLang(store.get(siteConfig.languageCookie)?.value, fallback);
}

export async function getI18n(fallback?: Lang): Promise<{ lang: Lang; dict: Dict }> {
  const lang = await getLang(fallback);
  return { lang, dict: getDict(lang) };
}

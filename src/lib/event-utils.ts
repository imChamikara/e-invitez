import { siteConfig, type Lang } from "@/config/site";
import type { EventData, EventSection, EventText } from "./types";

const TEXT_KEYS: (keyof EventText)[] = ["title", "story", "venueName", "venueAddress"];

/** Applies the per-language overrides (if any) on top of the base text. */
export function localizeEvent(event: EventData, lang: Lang): EventData {
  const tr = event.translations[lang];
  const sections: EventSection[] = event.sections.map((s) => {
    const st = s.translations[lang];
    return {
      ...s,
      title: st?.title?.trim() || s.title,
      description: st?.description?.trim() || s.description,
    };
  });
  const text: Partial<EventText> = {};
  if (tr) for (const k of TEXT_KEYS) if (tr[k]?.trim()) text[k] = tr[k];
  return { ...event, ...text, sections };
}

export function eventUrl(slug: string, guestToken?: string): string {
  const base = `${siteConfig.domain}/e/${slug}`;
  return guestToken ? `${base}?g=${encodeURIComponent(guestToken)}` : base;
}

export function whatsappShareUrl(text: string, phone?: string | null): string {
  const digits = phone?.replace(/[^\d]/g, "");
  const base = digits ? `https://wa.me/${toIntlPhone(digits)}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

/** Sri Lankan numbers: 0771234567 → 94771234567. */
function toIntlPhone(digits: string): string {
  if (digits.startsWith("94")) return digits;
  if (digits.startsWith("0")) return `94${digits.slice(1)}`;
  return digits;
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 60;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Only allow http(s) links in href attributes. */
export function safeUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

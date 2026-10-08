import { LOCALES } from "@/i18n";
import type { Lang } from "@/config/site";

/** Sri Lanka has a single timezone (UTC+5:30, no DST) – used everywhere for consistency. */
export const TIME_ZONE = "Asia/Colombo";

function fmt(iso: string, lang: Lang, opts: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat(LOCALES[lang], { timeZone: TIME_ZONE, ...opts }).format(new Date(iso));
  } catch {
    // Older runtimes may lack si/ta locale data – fall back to English.
    return new Intl.DateTimeFormat("en-LK", { timeZone: TIME_ZONE, ...opts }).format(new Date(iso));
  }
}

export const formatLongDate = (iso: string, lang: Lang) =>
  fmt(iso, lang, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

export const formatShortDate = (iso: string, lang: Lang) =>
  fmt(iso, lang, { year: "numeric", month: "short", day: "numeric" });

export const formatTime = (iso: string, lang: Lang) =>
  fmt(iso, lang, { hour: "numeric", minute: "2-digit", hour12: true });

export const formatDateTime = (iso: string, lang: Lang) =>
  fmt(iso, lang, { dateStyle: "medium", timeStyle: "short" });

/** Value for <input type="datetime-local"> from an ISO timestamp, in Sri Lanka time. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 5.5 * 3600_000);
  return d.toISOString().slice(0, 16);
}

/** Inverse of toLocalInput. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}:00.000+05:30`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

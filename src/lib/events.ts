import { cache } from "react";
import { isLang, type Lang } from "@/config/site";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import {
  FONT_PAIRS,
  OCCASION_TYPES,
  type EventData,
  type EventSection,
  type EventText,
  type EventTheme,
  type GuestInfo,
  type OccasionType,
  type PlanKey,
} from "./types";

/**
 * Explicit column list – `select *` is not allowed on `events` because
 * `password_hash` is hidden from API clients.
 */
export const EVENT_COLUMNS =
  "id, owner_id, slug, occasion_type, title, template_key, language_default, event_date, venue_name, venue_address, maps_url, story, cover_image_url, theme, translations, rsvp_enabled, wishes_enabled, is_published, is_private, has_password, created_at";

/** Row shapes as returned by PostgREST. */
export interface EventRow {
  id: string;
  owner_id: string;
  slug: string;
  occasion_type: string;
  title: string;
  template_key: string;
  language_default: string;
  event_date: string | null;
  venue_name: string;
  venue_address: string;
  maps_url: string;
  story: string;
  cover_image_url: string | null;
  theme: unknown;
  translations: unknown;
  rsvp_enabled: boolean;
  wishes_enabled: boolean;
  is_published: boolean;
  is_private: boolean;
  has_password: boolean;
  created_at: string;
}
export interface SectionRow {
  id: string;
  title: string;
  starts_at: string | null;
  description: string;
  translations: unknown;
  sort_order: number;
}
interface PhotoRow {
  id: string;
  url: string;
  sort_order: number;
}
interface WishRow {
  id: string;
  name: string;
  message: string;
  created_at: string;
}

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function parseTheme(v: unknown): EventTheme {
  const o = asObject(v);
  return {
    accent: typeof o.accent === "string" && /^#[0-9a-fA-F]{6}$/.test(o.accent) ? o.accent : undefined,
    fontPair: FONT_PAIRS.find((f) => f === o.fontPair),
  };
}

function parseTranslations<T>(v: unknown, keys: (keyof T)[]): Partial<Record<Lang, Partial<T>>> {
  const out: Partial<Record<Lang, Partial<T>>> = {};
  for (const [lang, val] of Object.entries(asObject(v))) {
    if (!isLang(lang)) continue;
    const o = asObject(val);
    const picked: Partial<T> = {};
    for (const k of keys) if (typeof o[k as string] === "string") picked[k] = o[k as string] as T[keyof T];
    out[lang] = picked;
  }
  return out;
}

export function mapSection(r: SectionRow): EventSection {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    startsAt: r.starts_at,
    sortOrder: r.sort_order,
    translations: parseTranslations(r.translations, ["title", "description"]),
  };
}

export function mapEvent(
  r: EventRow,
  extras: { sections?: SectionRow[]; photos?: PhotoRow[]; wishes?: WishRow[]; plan?: PlanKey } = {},
): EventData {
  return {
    id: r.id,
    slug: r.slug,
    occasionType: (OCCASION_TYPES as readonly string[]).includes(r.occasion_type)
      ? (r.occasion_type as OccasionType)
      : "wedding",
    templateKey: r.template_key,
    languageDefault: isLang(r.language_default) ? r.language_default : "en",
    title: r.title,
    story: r.story,
    venueName: r.venue_name,
    venueAddress: r.venue_address,
    eventDate: r.event_date,
    mapsUrl: r.maps_url,
    coverImageUrl: r.cover_image_url,
    theme: parseTheme(r.theme),
    isPublished: r.is_published,
    isPrivate: r.is_private,
    hasPassword: r.has_password,
    rsvpEnabled: r.rsvp_enabled,
    wishesEnabled: r.wishes_enabled,
    plan: extras.plan ?? "free",
    sections: (extras.sections ?? []).map(mapSection).sort((a, b) => a.sortOrder - b.sortOrder),
    photos: (extras.photos ?? []).sort((a, b) => a.sort_order - b.sort_order).map((p) => ({ id: p.id, url: p.url })),
    wishes: (extras.wishes ?? []).map((w) => ({ id: w.id, name: w.name, message: w.message, createdAt: w.created_at })),
    translations: parseTranslations<EventText>(r.translations, ["title", "story", "venueName", "venueAddress"]),
  };
}

function asPlan(v: unknown): PlanKey {
  return v === "standard" || v === "premium" ? v : "free";
}

/**
 * Loads an event by slug with sections, photos and approved wishes.
 * RLS returns published events to everyone, and unpublished ones only to their owner.
 * Returns null when Supabase is not configured or the event does not exist.
 */
export const getEventBySlug = cache(async (slug: string): Promise<EventData | null> => {
  if (!hasSupabase()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      `${EVENT_COLUMNS}, event_sections(id, title, starts_at, description, translations, sort_order), event_photos(id, url, sort_order), wishes(id, name, message, created_at)`,
    )
    .eq("slug", slug)
    .order("sort_order", { referencedTable: "event_sections" })
    .order("sort_order", { referencedTable: "event_photos" })
    .order("created_at", { referencedTable: "wishes", ascending: false })
    .limit(60, { referencedTable: "wishes" })
    .maybeSingle();
  if (error || !data) return null;

  const { event_sections, event_photos, wishes, ...row } = data as unknown as EventRow & {
    event_sections: SectionRow[];
    event_photos: PhotoRow[];
    wishes: WishRow[];
  };
  const { data: plan } = await supabase.rpc("event_owner_plan", { p_event: row.id });
  return mapEvent(row, { sections: event_sections, photos: event_photos, wishes, plan: asPlan(plan) });
});

/** Resolves a personal guest link token (public RPC – guests table itself is owner-only). */
export async function getGuestByToken(slug: string, token: string): Promise<GuestInfo | null> {
  if (!hasSupabase() || !token) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_guest_by_token", { p_slug: slug, p_token: token });
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  return { id: row.id, name: row.name, expectedCount: row.expected_count, token };
}

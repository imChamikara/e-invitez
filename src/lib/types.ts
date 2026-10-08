import type { Lang, PlanKey } from "@/config/site";

export type { Lang, PlanKey };

export const OCCASION_TYPES = [
  "wedding",
  "homecoming",
  "engagement",
  "big_girl",
  "birthday",
  "baby_shower",
  "house_warming",
  "dana",
] as const;
export type OccasionType = (typeof OCCASION_TYPES)[number];

export const FONT_PAIRS = ["serif", "sans", "display"] as const;
export type FontPair = (typeof FONT_PAIRS)[number];

export interface EventTheme {
  accent?: string;
  fontPair?: FontPair;
}

/** Text fields that can be entered per language. */
export interface EventText {
  title: string;
  story: string;
  venueName: string;
  venueAddress: string;
}

export interface SectionText {
  title: string;
  description: string;
}

export interface EventSection {
  id: string;
  title: string;
  description: string;
  /** ISO timestamp (UTC) or null when no time is set. */
  startsAt: string | null;
  sortOrder: number;
  translations: Partial<Record<Lang, Partial<SectionText>>>;
}

export interface EventPhoto {
  id: string;
  url: string;
}

export interface Wish {
  id: string;
  name: string;
  message: string;
  createdAt: string;
}

/** Fully resolved event as consumed by templates (text already localised). */
export interface EventData extends EventText {
  id: string;
  slug: string;
  occasionType: OccasionType;
  templateKey: string;
  languageDefault: Lang;
  /** ISO timestamp (UTC) or null. */
  eventDate: string | null;
  mapsUrl: string;
  coverImageUrl: string | null;
  theme: EventTheme;
  isPublished: boolean;
  isPrivate: boolean;
  hasPassword: boolean;
  rsvpEnabled: boolean;
  wishesEnabled: boolean;
  plan: PlanKey;
  sections: EventSection[];
  photos: EventPhoto[];
  wishes: Wish[];
  /** Optional per-language overrides, kept so the editor can round-trip them. */
  translations: Partial<Record<Lang, Partial<EventText>>>;
}

export interface GuestInfo {
  name: string;
  expectedCount: number;
  token: string;
  id?: string;
}

export const MEAL_OPTIONS = ["any", "veg", "nonveg", "none"] as const;
export type MealPreference = (typeof MEAL_OPTIONS)[number];

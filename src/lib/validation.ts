import { z } from "zod";
import { LANG_CODES } from "@/config/site";
import { FONT_PAIRS, MEAL_OPTIONS, OCCASION_TYPES } from "./types";

const trimmed = (max: number) => z.string().trim().max(max);

export const rsvpSchema = z.object({
  slug: z.string().min(1).max(80),
  guestToken: z.string().max(80).optional(),
  name: trimmed(120).min(1),
  attending: z.enum(["yes", "no"]),
  partySize: z.coerce.number().int().min(1).max(50).default(1),
  meal: z.enum(MEAL_OPTIONS).default("any"),
  message: trimmed(500).default(""),
});

export const wishSchema = z.object({
  slug: z.string().min(1).max(80),
  name: trimmed(80).min(1),
  message: trimmed(500).min(1),
});

/** Slug rules shared by the wizard (client) and server actions. */
export const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

const textTranslation = z.object({
  title: trimmed(160).optional(),
  story: trimmed(4000).optional(),
  venueName: trimmed(200).optional(),
  venueAddress: trimmed(400).optional(),
});

export const sectionInputSchema = z.object({
  title: trimmed(160).min(1),
  startsAt: z.string().nullable(),
  description: trimmed(1000).default(""),
  translations: z
    .record(z.enum(LANG_CODES as [string, ...string[]]), z.object({ title: trimmed(160).optional(), description: trimmed(1000).optional() }))
    .default({}),
});

export const eventInputSchema = z.object({
  occasionType: z.enum(OCCASION_TYPES),
  templateKey: z.string().min(1).max(60),
  languageDefault: z.enum(LANG_CODES as [string, ...string[]]),
  title: trimmed(160).min(1),
  slug: slugSchema,
  eventDate: z.string().nullable(),
  venueName: trimmed(200).default(""),
  venueAddress: trimmed(400).default(""),
  mapsUrl: z.union([z.literal(""), z.url().max(500)]).default(""),
  story: trimmed(4000).default(""),
  theme: z.object({ accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(), fontPair: z.enum(FONT_PAIRS).optional() }),
  translations: z.record(z.enum(LANG_CODES as [string, ...string[]]), textTranslation).default({}),
  rsvpEnabled: z.boolean().default(true),
  wishesEnabled: z.boolean().default(true),
  isPrivate: z.boolean().default(false),
});

export type EventInput = z.infer<typeof eventInputSchema>;
export type SectionInput = z.infer<typeof sectionInputSchema>;

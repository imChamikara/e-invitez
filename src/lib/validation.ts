import { z } from "zod";
import { LANG_CODES } from "@/config/site";
import { normaliseMapsUrl } from "./event-utils";
import { TEXT_LIMITS } from "./limits";
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
  title: trimmed(TEXT_LIMITS.title).optional(),
  story: trimmed(TEXT_LIMITS.story).optional(),
  venueName: trimmed(TEXT_LIMITS.venueName).optional(),
  venueAddress: trimmed(TEXT_LIMITS.venueAddress).optional(),
});

const langKey = z.enum(LANG_CODES as [string, ...string[]]);

export const sectionInputSchema = z.object({
  title: trimmed(TEXT_LIMITS.sectionTitle).min(1),
  startsAt: z.string().nullable(),
  description: trimmed(TEXT_LIMITS.sectionDescription).default(""),
  // partialRecord: only languages that have text are sent (z.record would require all of them).
  translations: z
    .partialRecord(
      langKey,
      z.object({
        title: trimmed(TEXT_LIMITS.sectionTitle).optional(),
        description: trimmed(TEXT_LIMITS.sectionDescription).optional(),
      }),
    )
    .default({}),
});

export const eventInputSchema = z.object({
  occasionType: z.enum(OCCASION_TYPES),
  templateKey: z.string().min(1).max(60),
  languageDefault: z.enum(LANG_CODES as [string, ...string[]]),
  title: trimmed(TEXT_LIMITS.title).min(1),
  slug: slugSchema,
  eventDate: z.string().nullable(),
  venueName: trimmed(TEXT_LIMITS.venueName).default(""),
  venueAddress: trimmed(TEXT_LIMITS.venueAddress).default(""),
  mapsUrl: z
    .preprocess(
      (value) => (typeof value === "string" ? normaliseMapsUrl(value) : value),
      z.union([z.literal(""), z.url().max(TEXT_LIMITS.mapsUrl)]),
    )
    .default(""),
  story: trimmed(TEXT_LIMITS.story).default(""),
  theme: z.object({ accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(), fontPair: z.enum(FONT_PAIRS).optional() }),
  translations: z.partialRecord(langKey, textTranslation).default({}),
  rsvpEnabled: z.boolean().default(true),
  wishesEnabled: z.boolean().default(true),
  isPrivate: z.boolean().default(false),
});

/** Everything the editor sends to saveEvent(). */
export const saveSchema = z.object({
  event: eventInputSchema,
  sections: z.array(sectionInputSchema).max(40),
  photos: z.array(z.url()).max(80),
  coverImageUrl: z.url().nullable(),
  password: z.string().max(TEXT_LIMITS.password).optional(),
  publish: z.boolean(),
});
export type SavePayload = z.input<typeof saveSchema>;

export type EventInput = z.infer<typeof eventInputSchema>;
export type SectionInput = z.infer<typeof sectionInputSchema>;

import { LANG_CODES, type Lang } from "@/config/site";
import { fromLocalInput, toLocalInput } from "@/lib/format";
import type { SavePayload } from "@/app/dashboard/actions";
import type { EventData, EventText, FontPair, OccasionType } from "@/lib/types";

/** Flat, string-based shape the form edits (dates as datetime-local strings, etc.). */
export interface SectionValues {
  title: string;
  startsAt: string;
  description: string;
  /** Title per language (non-default languages only are saved). */
  titleTr: Record<Lang, string>;
}

export interface EditorValues {
  occasionType: OccasionType;
  templateKey: string;
  languageDefault: Lang;
  title: string;
  slug: string;
  eventDate: string;
  venueName: string;
  venueAddress: string;
  mapsUrl: string;
  story: string;
  accent: string;
  fontPair: FontPair;
  rsvpEnabled: boolean;
  wishesEnabled: boolean;
  isPrivate: boolean;
  password: string;
  clearPassword: boolean;
  tr: Record<Lang, EventText>;
  sections: SectionValues[];
  photos: string[];
  coverImageUrl: string | null;
  publish: boolean;
}

const emptyLangs = <T,>(make: () => T): Record<Lang, T> =>
  Object.fromEntries(LANG_CODES.map((l) => [l, make()])) as Record<Lang, T>;

const emptyText = (): EventText => ({ title: "", story: "", venueName: "", venueAddress: "" });

export function defaultValues(lang: Lang): EditorValues {
  return {
    occasionType: "wedding",
    templateKey: "classic-wedding",
    languageDefault: lang,
    title: "",
    slug: "",
    eventDate: "",
    venueName: "",
    venueAddress: "",
    mapsUrl: "",
    story: "",
    accent: "",
    fontPair: "serif",
    rsvpEnabled: true,
    wishesEnabled: true,
    isPrivate: false,
    password: "",
    clearPassword: false,
    tr: emptyLangs(emptyText),
    sections: [],
    photos: [],
    coverImageUrl: null,
    publish: false,
  };
}

export function eventToValues(e: EventData): EditorValues {
  const tr = emptyLangs(emptyText);
  for (const l of LANG_CODES) tr[l] = { ...emptyText(), ...e.translations[l] };
  return {
    occasionType: e.occasionType,
    templateKey: e.templateKey,
    languageDefault: e.languageDefault,
    title: e.title,
    slug: e.slug,
    eventDate: toLocalInput(e.eventDate),
    venueName: e.venueName,
    venueAddress: e.venueAddress,
    mapsUrl: e.mapsUrl,
    story: e.story,
    accent: e.theme.accent ?? "",
    fontPair: e.theme.fontPair ?? "serif",
    rsvpEnabled: e.rsvpEnabled,
    wishesEnabled: e.wishesEnabled,
    isPrivate: e.isPrivate,
    password: "",
    clearPassword: false,
    tr,
    sections: e.sections.map((s) => ({
      title: s.title,
      startsAt: toLocalInput(s.startsAt),
      description: s.description,
      titleTr: { ...emptyLangs(() => ""), ...Object.fromEntries(LANG_CODES.map((l) => [l, s.translations[l]?.title ?? ""])) },
    })),
    photos: e.photos.map((p) => p.url),
    coverImageUrl: e.coverImageUrl,
    publish: e.isPublished,
  };
}

export function valuesToPayload(v: EditorValues): SavePayload {
  const translations: Record<string, Partial<EventText>> = {};
  const sectionTr = (s: SectionValues) => {
    const out: Record<string, { title: string }> = {};
    for (const l of LANG_CODES) if (l !== v.languageDefault && s.titleTr[l].trim()) out[l] = { title: s.titleTr[l].trim() };
    return out;
  };
  for (const l of LANG_CODES) {
    if (l === v.languageDefault) continue;
    const t = v.tr[l];
    const picked = Object.fromEntries(Object.entries(t).filter(([, val]) => val.trim()));
    if (Object.keys(picked).length) translations[l] = picked;
  }
  return {
    event: {
      occasionType: v.occasionType,
      templateKey: v.templateKey,
      languageDefault: v.languageDefault,
      title: v.title,
      slug: v.slug,
      eventDate: fromLocalInput(v.eventDate),
      venueName: v.venueName,
      venueAddress: v.venueAddress,
      mapsUrl: v.mapsUrl.trim(),
      story: v.story,
      theme: { ...(v.accent ? { accent: v.accent } : {}), fontPair: v.fontPair },
      translations,
      rsvpEnabled: v.rsvpEnabled,
      wishesEnabled: v.wishesEnabled,
      isPrivate: v.isPrivate,
    },
    sections: v.sections.map((s) => ({
      title: s.title,
      startsAt: fromLocalInput(s.startsAt),
      description: s.description,
      translations: sectionTr(s),
    })),
    photos: v.photos,
    coverImageUrl: v.coverImageUrl ?? v.photos[0] ?? null,
    // undefined = unchanged, "" = remove, otherwise set
    password: v.clearPassword ? "" : v.password || undefined,
    publish: v.publish,
  };
}

/** Builds a preview EventData: the user's values on top of the template's demo sample. */
export function valuesToPreview(v: EditorValues, base: EventData): EventData {
  const sections = v.sections.filter((s) => s.title.trim()).map((s, i) => ({
    id: `p${i}`,
    title: s.title,
    description: s.description,
    startsAt: fromLocalInput(s.startsAt),
    sortOrder: i,
    translations: Object.fromEntries(LANG_CODES.map((l) => [l, { title: s.titleTr[l] }])),
  }));
  const text: Partial<Record<Lang, Partial<EventText>>> = {};
  for (const l of LANG_CODES) if (l !== v.languageDefault) text[l] = v.tr[l];
  return {
    ...base,
    occasionType: v.occasionType,
    templateKey: v.templateKey,
    languageDefault: v.languageDefault,
    title: v.title || base.title,
    story: v.story || base.story,
    venueName: v.venueName || base.venueName,
    venueAddress: v.venueAddress || base.venueAddress,
    eventDate: fromLocalInput(v.eventDate) ?? base.eventDate,
    mapsUrl: v.mapsUrl,
    coverImageUrl: v.coverImageUrl ?? v.photos[0] ?? base.coverImageUrl,
    photos: v.photos.length ? v.photos.map((url, i) => ({ id: `ph${i}`, url })) : base.photos,
    sections: sections.length ? sections : base.sections,
    translations: v.title ? text : base.translations,
    theme: { accent: v.accent || undefined, fontPair: v.fontPair },
    rsvpEnabled: v.rsvpEnabled,
    wishesEnabled: v.wishesEnabled,
    plan: "premium",
  };
}

/**
 * Everything the editor knows about validating fields: the browser-side checks (mirroring
 * lib/validation) and where each field, or rejected server path, lives in the wizard.
 */
import type { FieldPath } from "react-hook-form";
import { LANG_CODES, siteConfig } from "@/config/site";
import { format, type Dict } from "@/i18n";
import { isValidSlug, normaliseMapsUrl, safeUrl } from "@/lib/event-utils";
import { TEXT_LIMITS, textLength } from "@/lib/limits";
import type { EditorValues } from "./editor-types";

export const STEPS = ["occasion", "template", "details", "photos", "timeline", "publish"] as const;
export type Step = (typeof STEPS)[number];
export type SlugState = "idle" | "checking" | "ok" | "bad";
export type EditorField = FieldPath<EditorValues>;

export interface FieldTarget {
  field: EditorField;
  step: Step;
  elementId: string;
  label: string;
}

export interface Requirement extends FieldTarget {
  /** "required" items are listed in the publish checklist; "invalid" ones only appear while failing. */
  kind: "required" | "invalid";
  ok: boolean;
  /** Only needed to publish; a draft can be saved without it. */
  publishOnly: boolean;
  message: string;
}

const langLabel = (code: string) => siteConfig.languages.find((l) => l.code === code)?.label ?? code;

/** Step, DOM id and readable label for an editor field. */
export function describeField(field: EditorField, dict: Dict): FieldTarget {
  const f = dict.dash.form;
  const w = dict.dash.wizard;
  const at = (step: Step, elementId: string, label: string): FieldTarget => ({ field, step, elementId, label });
  const [head, a, b, c] = field.split(".");

  if (head === "tr") {
    const ids: Record<string, [string, string]> = {
      title: [`f-tr-${a}-title`, f.title],
      story: [`f-tr-${a}-story`, f.story],
      venueName: [`f-tr-${a}-venue`, f.venueName],
      venueAddress: [`f-tr-${a}-addr`, f.venueAddress],
    };
    const [id, label] = ids[b ?? "title"] ?? ids.title;
    return at("details", id, `${langLabel(a)}: ${label}`);
  }
  if (head === "sections") {
    if (a === undefined) return at("timeline", "f-sec-add", dict.dash.steps.timeline);
    const n = Number(a);
    const item = format(w.itemLabel, { n: n + 1 });
    if (b === "description") return at("timeline", `f-sec-${n}-desc`, `${item}: ${f.itemDesc}`);
    if (b === "startsAt") return at("timeline", `f-sec-${n}-time`, `${item}: ${f.itemTime}`);
    if (b === "titleTr") return at("timeline", `f-sec-${n}-tr-${c}`, `${item}: ${f.itemTitle} (${langLabel(c)})`);
    return at("timeline", `f-sec-${n}`, format(w.reqSection, { n: n + 1 }));
  }
  switch (head) {
    case "occasionType":
      return at("occasion", "f-occasion", dict.dash.steps.occasion);
    case "templateKey":
      return at("template", "f-template", dict.dash.steps.template);
    case "title":
      return at("details", "f-title", w.reqTitle);
    case "eventDate":
      return at("details", "f-date", w.reqDate);
    case "venueName":
      return at("details", "f-venue", w.reqVenue);
    case "venueAddress":
      return at("details", "f-addr", f.venueAddress);
    case "mapsUrl":
      return at("details", "f-maps", f.mapsUrl);
    case "story":
      return at("details", "f-story", f.story);
    case "languageDefault":
      return at("details", "f-lang", f.languageDefault);
    case "accent":
      return at("details", "f-accent", f.accent);
    case "fontPair":
      return at("details", "f-font", f.fontPair);
    case "photos":
    case "coverImageUrl":
      return at("photos", "f-photos", f.photos);
    case "password":
      return at("publish", "f-pw", f.password);
    default:
      return at("publish", "f-slug", w.reqSlug);
  }
}

/** Payload paths (as zod reports them) whose editor field has a different name. */
const SERVER_FIELDS: Record<string, EditorField> = {
  "event.occasionType": "occasionType",
  "event.templateKey": "templateKey",
  "event.languageDefault": "languageDefault",
  "event.title": "title",
  "event.slug": "slug",
  "event.eventDate": "eventDate",
  "event.venueName": "venueName",
  "event.venueAddress": "venueAddress",
  "event.mapsUrl": "mapsUrl",
  "event.story": "story",
  "event.theme.accent": "accent",
  "event.theme.fontPair": "fontPair",
  password: "password",
  coverImageUrl: "coverImageUrl",
  sections: "sections",
};

/** Maps a rejected payload path to the editor field, or null when we don't know it. */
export function editorFieldFor(path: string): EditorField | null {
  if (Object.hasOwn(SERVER_FIELDS, path)) return SERVER_FIELDS[path];
  if (/^photos(\.\d+)?$/.test(path)) return "photos";

  const lang = `(${LANG_CODES.join("|")})`;
  let m = path.match(new RegExp(`^event\\.translations\\.${lang}(?:\\.(title|story|venueName|venueAddress))?$`));
  if (m) return `tr.${m[1]}.${m[2] ?? "title"}` as EditorField;
  m = path.match(/^sections\.(\d+)(?:\.(title|description|startsAt))?$/);
  if (m) return `sections.${m[1]}.${m[2] ?? "title"}` as EditorField;
  // A translated description has no input of its own; point at the item's description.
  m = path.match(new RegExp(`^sections\\.(\\d+)\\.translations\\.${lang}(?:\\.(title|description))?$`));
  if (m) return (m[3] === "description" ? `sections.${m[1]}.description` : `sections.${m[1]}.titleTr.${m[2]}`) as EditorField;
  return null;
}

export function isValidMapsUrl(input: string): boolean {
  const url = normaliseMapsUrl(input);
  return url === "" || safeUrl(url) !== null;
}

/**
 * The single list of browser-side checks. A payload that passes them (publishOnly ones aside)
 * is accepted by the server schema.
 * Draft: title, link and programme item titles. Publish: also date and venue.
 */
export function getRequirements(v: EditorValues, slugState: SlugState, dict: Dict): Requirement[] {
  const f = dict.dash.form;
  const list: Requirement[] = [];

  const required = (field: EditorField, ok: boolean, publishOnly: boolean) =>
    list.push({ ...describeField(field, dict), kind: "required", ok, publishOnly, message: f.required });
  const invalid = (field: EditorField, message: string) =>
    list.push({ ...describeField(field, dict), kind: "invalid", ok: false, publishOnly: false, message });
  const maxLength = (field: EditorField, value: string, max: number) => {
    if (textLength(value.trim()) > max) invalid(field, format(f.errors.tooLong, { max }));
  };

  required("title", v.title.trim() !== "", false);
  required("slug", isValidSlug(v.slug) && slugState !== "bad", false);
  required("eventDate", v.eventDate.trim() !== "", true);
  required("venueName", v.venueName.trim() !== "", true);
  // The server rejects an untitled programme item even in a draft.
  v.sections.forEach((s, i) => required(`sections.${i}.title`, s.title.trim() !== "", false));

  maxLength("title", v.title, TEXT_LIMITS.title);
  maxLength("venueName", v.venueName, TEXT_LIMITS.venueName);
  maxLength("venueAddress", v.venueAddress, TEXT_LIMITS.venueAddress);
  maxLength("story", v.story, TEXT_LIMITS.story);
  if (!isValidMapsUrl(v.mapsUrl)) invalid("mapsUrl", f.errors.maps);
  else maxLength("mapsUrl", normaliseMapsUrl(v.mapsUrl), TEXT_LIMITS.mapsUrl);

  const otherLangs = LANG_CODES.filter((l) => l !== v.languageDefault);
  for (const l of otherLangs) {
    maxLength(`tr.${l}.title`, v.tr[l].title, TEXT_LIMITS.title);
    maxLength(`tr.${l}.story`, v.tr[l].story, TEXT_LIMITS.story);
    maxLength(`tr.${l}.venueName`, v.tr[l].venueName, TEXT_LIMITS.venueName);
    maxLength(`tr.${l}.venueAddress`, v.tr[l].venueAddress, TEXT_LIMITS.venueAddress);
  }
  v.sections.forEach((s, i) => {
    maxLength(`sections.${i}.title`, s.title, TEXT_LIMITS.sectionTitle);
    maxLength(`sections.${i}.description`, s.description, TEXT_LIMITS.sectionDescription);
    for (const l of otherLangs) maxLength(`sections.${i}.titleTr.${l}`, s.titleTr[l], TEXT_LIMITS.sectionTitle);
  });
  // Not trimmed on the server.
  if (!v.clearPassword && textLength(v.password) > TEXT_LIMITS.password) {
    invalid("password", format(f.errors.tooLong, { max: TEXT_LIMITS.password }));
  }
  if (!v.photos.every((url) => safeUrl(url) !== null)) invalid("photos", f.errors.rejected);

  return list;
}

/** Reads a dotted field path, used to tell whether a rejected value has been changed since. */
export function valueAt(values: EditorValues, field: EditorField): string {
  const value = field.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown> | undefined)?.[key], values);
  return JSON.stringify(value) ?? "";
}

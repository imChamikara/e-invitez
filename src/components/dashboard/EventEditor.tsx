"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { checkSlug, saveEvent } from "@/app/dashboard/actions";
import { LANG_CODES, siteConfig, type Lang, type PlanKey } from "@/config/site";
import { format, type Dict } from "@/i18n";
import { slugify } from "@/lib/event-utils";
import { compressImage } from "@/lib/image";
import { featuresFor } from "@/lib/plans";
import { storage } from "@/lib/storage";
import { DEMO_EVENTS } from "@/lib/demo-data";
import { FONT_PAIRS, OCCASION_TYPES } from "@/lib/types";
import { TEMPLATES, getTemplate } from "@/templates/registry";
import { defaultValues, valuesToPayload, valuesToPreview, type EditorValues } from "./editor-types";

const STEPS = ["occasion", "template", "details", "photos", "timeline", "publish"] as const;
type Step = (typeof STEPS)[number];
type SlugState = "idle" | "checking" | "ok" | "bad";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PREVIEW_KEY = "editor-live-preview";
const DESKTOP_QUERY = "(min-width: 1024px)";

/** One required field: which step it lives on and which DOM id to focus. */
type ReqField = "title" | "slug" | "eventDate" | "venueName" | `sections.${number}.title`;
interface Requirement {
  field: ReqField;
  step: Step;
  label: string;
  elementId: string;
  ok: boolean;
  /** Only needed to publish; a draft can be saved without it. */
  publishOnly: boolean;
}

/** The single list of required fields (draft: title + slug; publish: also date, venue, programme titles). */
function getRequirements(v: EditorValues, slugState: SlugState, w: Dict["dash"]["wizard"]): Requirement[] {
  const slugOk = v.slug.length >= 3 && v.slug.length <= 60 && SLUG_RE.test(v.slug) && slugState !== "bad";
  return [
    { field: "title", step: "details", label: w.reqTitle, elementId: "f-title", ok: v.title.trim() !== "", publishOnly: false },
    { field: "slug", step: "publish", label: w.reqSlug, elementId: "f-slug", ok: slugOk, publishOnly: false },
    { field: "eventDate", step: "details", label: w.reqDate, elementId: "f-date", ok: v.eventDate.trim() !== "", publishOnly: true },
    { field: "venueName", step: "details", label: w.reqVenue, elementId: "f-venue", ok: v.venueName.trim() !== "", publishOnly: true },
    ...v.sections.map((s, i): Requirement => ({
      field: `sections.${i}.title`,
      step: "timeline",
      label: format(w.reqSection, { n: i + 1 }),
      elementId: `f-sec-${i}`,
      ok: s.title.trim() !== "",
      publishOnly: true,
    })),
  ];
}

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const desktopSnapshot = () => window.matchMedia(DESKTOP_QUERY).matches;
const desktopServerSnapshot = () => false;

/** Preview on/off choice, kept in localStorage (with an in-memory fallback when storage is blocked). */
let memoryPref = true;
const prefListeners = new Set<() => void>();
function subscribePref(onChange: () => void) {
  prefListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    prefListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}
function readPref(): boolean {
  try {
    const stored = localStorage.getItem(PREVIEW_KEY);
    if (stored !== null) return stored !== "0";
  } catch {
    /* storage unavailable */
  }
  return memoryPref;
}
function writePref(on: boolean) {
  memoryPref = on;
  try {
    localStorage.setItem(PREVIEW_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
  prefListeners.forEach((l) => l());
}

const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

/** The preview is for looking only: swallow clicks and submits so nothing inside it does anything. */
const blockEvent = (e: React.SyntheticEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

interface Props {
  dict: Dict;
  lang: Lang;
  userId: string;
  plan: PlanKey;
  /** Present when editing an existing event. */
  eventId?: string;
  initial?: EditorValues;
}

export function EventEditor({ dict, lang, userId, plan, eventId, initial }: Props) {
  const router = useRouter();
  const f = dict.dash.form;
  const w = dict.dash.wizard;
  const features = featuresFor(plan);
  const editing = Boolean(eventId);

  const form = useForm<EditorValues>({ defaultValues: initial ?? defaultValues(lang) });
  const { register, control, setValue, getValues, setError, clearErrors, getFieldState, formState } = form;
  const sections = useFieldArray({ control, name: "sections" });

  const [step, setStep] = useState<Step>(editing ? "details" : "occasion");
  const [direction, setDirection] = useState<"forward" | "back" | null>(null);
  const [visited, setVisited] = useState<Set<Step>>(() => new Set([editing ? "details" : "occasion"]));
  const [slugState, setSlugState] = useState<SlugState>("idle");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  /** Set after a failed save/publish attempt so missing fields get flagged. */
  const [attempt, setAttempt] = useState<"draft" | "publish" | null>(null);
  const [summaryTick, setSummaryTick] = useState(0);
  const [navTick, setNavTick] = useState(0);
  const [mobilePreview, setMobilePreview] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const stepperRef = useRef<HTMLOListElement>(null);
  /** What to do after the next navigation: focus a field, or the new step's heading. */
  const pending = useRef<{ focusId?: string } | null>(null);

  const previewOn = useSyncExternalStore(subscribePref, readPref, () => true);
  const isDesktop = useSyncExternalStore(subscribeDesktop, desktopSnapshot, desktopServerSnapshot);
  const v = useWatch({ control }) as EditorValues;
  const stepIndex = STEPS.indexOf(step);

  const requirements = getRequirements(v, slugState, w);
  const publishReady = requirements.every((r) => r.ok);
  const missing = attempt ? requirements.filter((r) => !r.ok && (attempt === "publish" || !r.publishOnly)) : [];
  const stepsWithMissing = new Set(missing.map((r) => r.step));

  // Suggest a slug from the title until the owner edits it themselves.
  useEffect(() => {
    if (!slugTouched) setValue("slug", slugify(v.title));
  }, [v.title, slugTouched, setValue]);

  // Debounced availability check.
  useEffect(() => {
    const slug = v.slug;
    const timer = setTimeout(async () => {
      if (!slug) return setSlugState("idle");
      setSlugState("checking");
      try {
        setSlugState((await checkSlug(slug, eventId)) ? "ok" : "bad");
      } catch {
        setSlugState("idle");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [v.slug, eventId]);

  // Clear a field's error as soon as it becomes valid (react-hook-form only does this after a submit).
  useEffect(() => {
    for (const r of requirements) {
      if (r.ok && getFieldState(r.field).error) clearErrors(r.field);
    }
  });

  // After navigating: scroll to the top of the editor and focus the new heading, or focus a specific field.
  useEffect(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    const behavior = scrollBehavior();
    if (p.focusId) {
      const el = document.getElementById(p.focusId);
      el?.scrollIntoView({ behavior, block: "center" });
      el?.focus({ preventScroll: true });
    } else {
      topRef.current?.scrollIntoView({ behavior, block: "start" });
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [navTick]);

  // After a failed save: bring the missing-fields summary into view.
  useEffect(() => {
    if (summaryTick === 0) return;
    summaryRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
    summaryRef.current?.focus({ preventScroll: true });
  }, [summaryTick]);

  // Keep the current step's pill visible in the horizontally scrolling stepper.
  useEffect(() => {
    stepperRef.current?.querySelector('[aria-current="step"]')?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
  }, [step]);

  // Full-screen mobile preview: Escape closes it and the page behind does not scroll.
  const overlayOpen = mobilePreview && !isDesktop;
  useEffect(() => {
    if (!overlayOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobilePreview(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [overlayOpen]);

  const showingPreview = isDesktop ? previewOn : overlayOpen;
  // Cheap enough to rebuild each render; only computed when a preview is on screen.
  const preview = showingPreview
    ? { ...valuesToPreview(v, DEMO_EVENTS[v.templateKey] ?? DEMO_EVENTS["classic-wedding"]), plan }
    : null;

  function goTo(target: Step, focusId?: string) {
    if (target !== step) {
      setDirection(STEPS.indexOf(target) > stepIndex ? "forward" : "back");
      setStep(target);
      setVisited((prev) => new Set(prev).add(target));
    }
    pending.current = { focusId };
    setNavTick((t) => t + 1);
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setMessage(null);
    try {
      const room = features.maxPhotos - getValues("photos").length;
      for (const file of Array.from(files).slice(0, Math.max(0, room))) {
        const { blob, type, ext } = await compressImage(file);
        const url = await storage.upload(`${userId}/${crypto.randomUUID()}.${ext}`, blob, type);
        setValue("photos", [...getValues("photos"), url], { shouldDirty: true });
      }
    } catch {
      setMessage({ kind: "error", text: f.errors.failed });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removePhoto(url: string) {
    setValue("photos", getValues("photos").filter((p) => p !== url), { shouldDirty: true });
    if (getValues("coverImageUrl") === url) setValue("coverImageUrl", null);
  }

  async function save(publish: boolean) {
    setValue("publish", publish);
    setMessage(null);
    const mode = publish ? "publish" : "draft";
    const problems = requirements.filter((r) => !r.ok && (publish || !r.publishOnly));
    if (problems.length) {
      setAttempt(mode);
      for (const r of problems) setError(r.field, { type: "required" });
      setSummaryTick((t) => t + 1);
      return;
    }
    setAttempt(null);
    setSaving(true);
    const result = await saveEvent(eventId ?? null, valuesToPayload(getValues()));
    setSaving(false);
    if (!result.ok) {
      const errors = f.errors as Record<string, string>;
      setMessage({ kind: "error", text: errors[result.error] ?? f.errors.failed });
      return;
    }
    if (editing) {
      setMessage({ kind: "ok", text: f.saved });
      router.refresh();
    } else {
      router.push(`/dashboard/${result.id}`);
    }
  }

  const otherLangs = LANG_CODES.filter((l) => l !== v.languageDefault);
  const suggested = TEMPLATES.filter((t) => t.occasions.includes(v.occasionType));
  const ordered = [...suggested, ...TEMPLATES.filter((t) => !suggested.includes(t))];
  const Preview = getTemplate(v.templateKey).Component;

  const headings: Record<Step, string> = {
    occasion: w.pickOccasion,
    template: w.pickTemplate,
    details: w.detailsTitle,
    photos: w.photosTitle,
    timeline: w.timelineTitle,
    publish: w.publishTitle,
  };
  const errors = formState.errors;
  const slugFormatBad = v.slug !== "" && !(v.slug.length >= 3 && v.slug.length <= 60 && SLUG_RE.test(v.slug));
  const wide = isDesktop && previewOn;

  const previewNode = preview ? (
    <div
      aria-hidden="true"
      onClickCapture={blockEvent}
      onSubmitCapture={blockEvent}
      className="mx-auto h-full w-full max-w-[390px] overflow-y-auto overscroll-contain rounded-[2rem] border-4 border-ink bg-white"
    >
      <Preview event={{ ...preview, id: "preview" }} lang={lang} dict={dict} guest={null} demo showBranding={!features.removeBranding} />
    </div>
  ) : null;

  const requiredMsg = <p role="alert" className="mt-1 text-red-800">{f.required}</p>;

  return (
    <div className={wide ? "relative left-1/2 w-[min(72rem,calc(100vw-3rem))] -translate-x-1/2" : ""}>
      <div ref={topRef} className="scroll-mt-2" />
      <div className={wide ? "grid grid-cols-[minmax(0,1fr)_420px] gap-8" : ""}>
        <div className="min-w-0 space-y-6">
          {isDesktop && (
            <div className="flex justify-end">
              <label className="tap flex cursor-pointer items-center gap-3 font-semibold">
                <input
                  type="checkbox"
                  role="switch"
                  checked={previewOn}
                  onChange={(e) => writePref(e.target.checked)}
                  className="h-5 w-5 accent-[var(--brand)]"
                />
                {w.showPreview}
              </label>
            </div>
          )}

          {/* Stepper: sticky, scrolls sideways on small screens */}
          <nav aria-label="Steps" className="sticky top-0 z-20 -mx-1 bg-paper px-1 py-2">
            <ol ref={stepperRef} className="flex gap-2 overflow-x-auto pb-1">
              {STEPS.map((s, i) => {
                const current = s === step;
                const done = visited.has(s) && !current && !requirements.some((r) => r.step === s && !r.ok);
                const flagged = stepsWithMissing.has(s);
                return (
                  <li key={s} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => goTo(s)}
                      aria-current={current ? "step" : undefined}
                      className={`tap inline-flex items-center whitespace-nowrap rounded-full px-4 text-base font-semibold ${
                        current ? "bg-brand text-white" : done ? "bg-green-100 text-green-900" : "bg-brand-soft text-brand-dark"
                      }`}
                    >
                      <span aria-hidden="true">{done ? "✓" : i + 1}.&nbsp;</span>
                      {dict.dash.steps[s]}
                      {done && <span className="sr-only"> ({w.stepDone})</span>}
                      {flagged && (
                        <>
                          <span aria-hidden="true" className="ml-2 inline-block h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white" />
                          <span className="sr-only"> ({w.stepMissing})</span>
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          {missing.length > 0 && (
            <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-4 outline-none">
              <p className="font-bold text-red-900">
                {format(attempt === "publish" ? w.missingPublish : w.missingDraft, { count: missing.length })}
              </p>
              <ul className="mt-2 space-y-1">
                {missing.map((r) => (
                  <li key={r.field}>
                    <button type="button" className="tap text-left font-semibold text-red-900 underline" onClick={() => goTo(r.step, r.elementId)}>
                      {r.label}
                      <span className="font-normal no-underline"> · {dict.dash.steps[r.step]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div key={step} className={direction === "forward" ? "step-in-forward" : direction === "back" ? "step-in-back" : ""}>
            <h2 ref={headingRef} tabIndex={-1} style={{ outline: "none" }} className="mb-4 text-2xl font-bold">{headings[step]}</h2>

            {step === "occasion" && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {OCCASION_TYPES.map((o) => (
                    <label key={o} className={`tap flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 text-lg ${v.occasionType === o ? "border-brand bg-brand-soft" : "border-line bg-white"}`}>
                      <input
                        type="radio"
                        value={o}
                        checked={v.occasionType === o}
                        onChange={() => {
                          setValue("occasionType", o);
                          const first = TEMPLATES.find((t) => t.occasions.includes(o));
                          if (first) {
                            setValue("templateKey", first.key);
                            setValue("fontPair", first.defaultTheme.fontPair);
                          }
                        }}
                        className="h-5 w-5 accent-[var(--brand)]"
                      />
                      {dict.common.occasions[o]}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {step === "template" && (
              <div className="space-y-3">
                <p className="text-muted">{w.templateHint}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ordered.map((t) => {
                    const meta = dict.common.templates[t.key as keyof typeof dict.common.templates];
                    return (
                      <label key={t.key} className={`flex cursor-pointer gap-3 rounded-xl border-2 p-4 ${v.templateKey === t.key ? "border-brand bg-brand-soft" : "border-line bg-white"}`}>
                        <input
                          type="radio"
                          checked={v.templateKey === t.key}
                          onChange={() => {
                            setValue("templateKey", t.key);
                            setValue("fontPair", t.defaultTheme.fontPair);
                          }}
                          className="mt-1 h-5 w-5 accent-[var(--brand)]"
                        />
                        <span>
                          <span className="flex items-center gap-2 text-lg font-semibold">
                            <span aria-hidden="true" className="inline-block h-4 w-4 rounded-full" style={{ background: t.defaultTheme.accent }} />
                            {meta?.name ?? t.key}
                            {suggested.includes(t) && <span className="rounded-full bg-green-100 px-2 text-sm text-green-900">{w.suggested}</span>}
                          </span>
                          <span className="text-muted">{meta?.desc}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {step === "details" && (
              <div className="space-y-5">
                <div>
                  <label htmlFor="f-title" className="mb-1 block font-semibold">{f.title}</label>
                  <input id="f-title" className="field" placeholder={f.titleHint} aria-invalid={Boolean(errors.title)} {...register("title", { maxLength: 160 })} />
                  {errors.title && requiredMsg}
                </div>
                <div>
                  <label htmlFor="f-date" className="mb-1 block font-semibold">{f.date}</label>
                  <input id="f-date" type="datetime-local" className="field" aria-invalid={Boolean(errors.eventDate)} {...register("eventDate")} />
                  {errors.eventDate && requiredMsg}
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="f-venue" className="mb-1 block font-semibold">{f.venueName}</label>
                    <input id="f-venue" className="field" aria-invalid={Boolean(errors.venueName)} {...register("venueName")} />
                    {errors.venueName && requiredMsg}
                  </div>
                  <div>
                    <label htmlFor="f-addr" className="mb-1 block font-semibold">{f.venueAddress}</label>
                    <input id="f-addr" className="field" {...register("venueAddress")} />
                  </div>
                </div>
                <div>
                  <label htmlFor="f-maps" className="mb-1 block font-semibold">{f.mapsUrl}</label>
                  <input id="f-maps" type="url" inputMode="url" className="field" placeholder="https://maps.app.goo.gl/…" {...register("mapsUrl")} />
                  <p className="mt-1 text-sm text-muted">{f.mapsHint}</p>
                </div>
                <div>
                  <label htmlFor="f-story" className="mb-1 block font-semibold">{f.story}</label>
                  <textarea id="f-story" rows={5} className="field" {...register("story", { maxLength: 4000 })} />
                </div>
                <div>
                  <label htmlFor="f-lang" className="mb-1 block font-semibold">{f.languageDefault}</label>
                  <select id="f-lang" className="field" {...register("languageDefault")}>
                    {siteConfig.languages.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                  <p className="mt-1 text-sm text-muted">{f.languageHint}</p>
                </div>

                <details className="card p-4">
                  <summary className="tap cursor-pointer font-semibold">{f.otherLanguages}</summary>
                  <div className="mt-4 space-y-6">
                    {otherLangs.map((l) => (
                      <fieldset key={l} className="space-y-3" lang={l}>
                        <legend className="font-bold">{siteConfig.languages.find((x) => x.code === l)?.label}</legend>
                        <input aria-label={f.title} placeholder={f.title} className="field" {...register(`tr.${l}.title`)} />
                        <textarea aria-label={f.story} placeholder={f.story} rows={3} className="field" {...register(`tr.${l}.story`)} />
                        <input aria-label={f.venueName} placeholder={f.venueName} className="field" {...register(`tr.${l}.venueName`)} />
                        <input aria-label={f.venueAddress} placeholder={f.venueAddress} className="field" {...register(`tr.${l}.venueAddress`)} />
                      </fieldset>
                    ))}
                  </div>
                </details>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="f-accent" className="mb-1 block font-semibold">{f.accent}</label>
                    <div className="flex items-center gap-3">
                      <input
                        id="f-accent"
                        type="color"
                        disabled={!features.customThemeColour}
                        value={v.accent || getTemplate(v.templateKey).defaultTheme.accent}
                        onChange={(e) => setValue("accent", e.target.value)}
                        className="h-12 w-16 cursor-pointer rounded border disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      {v.accent && features.customThemeColour && (
                        <button type="button" className="tap underline" onClick={() => setValue("accent", "")}>{dict.common.cancel}</button>
                      )}
                    </div>
                    {!features.customThemeColour && <p className="mt-1 text-sm text-muted">{f.accentLocked}</p>}
                  </div>
                  <div>
                    <label htmlFor="f-font" className="mb-1 block font-semibold">{f.fontPair}</label>
                    <select id="f-font" className="field" {...register("fontPair")}>
                      {FONT_PAIRS.map((p) => <option key={p} value={p}>{dict.common.fontPairs[p]}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  {([["rsvpEnabled", f.rsvpEnabled], ["wishesEnabled", f.wishesEnabled]] as const).map(([name, label]) => (
                    <label key={name} className="tap flex items-center gap-3">
                      <input type="checkbox" className="h-5 w-5 accent-[var(--brand)]" {...register(name)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {step === "photos" && (
              <div className="space-y-4">
                <p className="text-muted">{f.photosHint} {format(f.photoLimit, { max: features.maxPhotos })}</p>
                <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" id="f-photos" onChange={(e) => onFiles(e.target.files)} />
                <label htmlFor="f-photos" className={`btn-accent cursor-pointer ${uploading || v.photos.length >= features.maxPhotos ? "pointer-events-none opacity-60" : ""}`}>
                  {uploading ? f.uploading : `+ ${f.upload}`}
                </label>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {v.photos.map((url) => {
                    const isCover = (v.coverImageUrl ?? v.photos[0]) === url;
                    return (
                      <li key={url} className="card overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
                        <div className="flex flex-col gap-1 p-2">
                          {isCover ? (
                            <span className="text-center font-semibold text-green-800">✓ {f.isCover}</span>
                          ) : (
                            <button type="button" className="tap underline" onClick={() => setValue("coverImageUrl", url)}>{f.makeCover}</button>
                          )}
                          <button type="button" className="tap text-red-800 underline" onClick={() => removePhoto(url)}>{f.remove}</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {step === "timeline" && (
              <div className="space-y-4">
                <ul className="space-y-4">
                  {sections.fields.map((field, i) => (
                    <li key={field.id} className="card space-y-3 p-4">
                      <div>
                        <input
                          id={`f-sec-${i}`}
                          aria-label={f.itemTitle}
                          placeholder={f.itemTitle}
                          className="field"
                          aria-invalid={Boolean(errors.sections?.[i]?.title)}
                          {...register(`sections.${i}.title`)}
                        />
                        {errors.sections?.[i]?.title && requiredMsg}
                      </div>
                      <input aria-label={f.itemTime} type="datetime-local" className="field" {...register(`sections.${i}.startsAt`)} />
                      <input aria-label={f.itemDesc} placeholder={f.itemDesc} className="field" {...register(`sections.${i}.description`)} />
                      {otherLangs.map((l) => (
                        <input key={l} lang={l} aria-label={`${f.itemTitle} (${l})`} placeholder={`${siteConfig.languages.find((x) => x.code === l)?.label}: ${f.itemTitle}`} className="field" {...register(`sections.${i}.titleTr.${l}`)} />
                      ))}
                      <button type="button" className="tap text-red-800 underline" onClick={() => sections.remove(i)}>{f.removeItem}</button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn-outline"
                  disabled={sections.fields.length >= features.maxSections}
                  onClick={() => sections.append({ title: "", startsAt: v.eventDate, description: "", titleTr: { en: "", si: "", ta: "" } })}
                >
                  + {f.addItem}
                </button>
                <p className="text-sm text-muted">{format(f.itemLimit, { max: features.maxSections })}</p>
              </div>
            )}

            {step === "publish" && (
              <div className="space-y-5">
                <div>
                  <label htmlFor="f-slug" className="mb-1 block font-semibold">{f.slug}</label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted">/e/</span>
                    <input
                      id="f-slug"
                      className="field"
                      autoCapitalize="none"
                      aria-invalid={Boolean(errors.slug) || slugState === "bad"}
                      {...register("slug", { maxLength: 60, onChange: () => setSlugTouched(true) })}
                    />
                  </div>
                  <p className="mt-1 text-sm text-muted">{f.slugHint}</p>
                  {errors.slug && v.slug === "" && requiredMsg}
                  <p aria-live="polite" className={`mt-1 font-semibold ${slugState === "ok" && !slugFormatBad ? "text-green-800" : slugState === "bad" || slugFormatBad ? "text-red-800" : "text-muted"}`}>
                    {slugState === "checking" && !slugFormatBad && f.slugChecking}
                    {slugFormatBad && f.slugInvalid}
                    {!slugFormatBad && slugState === "bad" && f.slugTaken}
                    {!slugFormatBad && slugState === "ok" && `✓ ${f.slugOk}`}
                  </p>
                </div>

                <label className="tap flex items-center gap-3">
                  <input type="checkbox" className="h-5 w-5 accent-[var(--brand)]" {...register("isPrivate")} />
                  {f.private}
                </label>

                <div>
                  <label htmlFor="f-pw" className="mb-1 block font-semibold">{f.password}</label>
                  <input id="f-pw" type="text" autoComplete="off" disabled={!features.passwordProtection} className="field" {...register("password")} />
                  <p className="mt-1 text-sm text-muted">{features.passwordProtection ? f.passwordHint : f.passwordLocked}</p>
                  {editing && features.passwordProtection && (
                    <label className="tap mt-1 flex items-center gap-3">
                      <input type="checkbox" className="h-5 w-5 accent-[var(--brand)]" {...register("clearPassword")} />
                      {f.clearPassword}
                    </label>
                  )}
                </div>

                <section aria-labelledby="f-checklist" className="card space-y-2 p-4">
                  <h3 id="f-checklist" className="font-bold">{w.checklistTitle}</h3>
                  <ul className="space-y-1">
                    {requirements.map((r) => (
                      <li key={r.field}>
                        {r.ok ? (
                          <span className="font-semibold text-green-800">✓ {r.label}</span>
                        ) : (
                          <button type="button" className="tap text-left font-semibold text-red-800 underline" onClick={() => goTo(r.step, r.elementId)}>
                            ✗ {r.label}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {!publishReady && <p className="text-sm text-muted">{w.checklistBlocked}</p>}
                </section>

                <label className="tap flex items-center gap-3 font-semibold">
                  <input
                    type="checkbox"
                    disabled={!publishReady && !v.publish}
                    className="h-5 w-5 accent-[var(--brand)] disabled:cursor-not-allowed"
                    {...register("publish")}
                  />
                  {f.publishNow}
                </label>
              </div>
            )}
          </div>

          {message && (
            <p role={message.kind === "error" ? "alert" : "status"} className={`rounded-xl p-3 font-semibold ${message.kind === "error" ? "bg-red-50 text-red-800" : "bg-green-50 text-green-900"}`}>
              {message.text}
            </p>
          )}

          <div className="flex flex-wrap gap-3 border-t border-line pt-4">
            {stepIndex > 0 && !editing && (
              <button type="button" className="btn-outline" onClick={() => goTo(STEPS[stepIndex - 1])}>{dict.common.back}</button>
            )}
            {stepIndex < STEPS.length - 1 && !editing && (
              <button type="button" className="btn-accent" onClick={() => goTo(STEPS[stepIndex + 1])}>{dict.common.next}</button>
            )}
            {(editing || step === "publish") && (
              <button type="button" disabled={saving || uploading} className="btn-accent disabled:opacity-60" onClick={() => save(getValues("publish"))}>
                {saving ? f.saving : editing ? f.saveChanges : v.publish ? f.publishNow : f.saveDraft}
              </button>
            )}
          </div>
        </div>

        {/* Desktop: sticky side-by-side live preview, scrolls on its own */}
        {wide && (
          <aside aria-label={w.preview} className="sticky top-4 h-[calc(100vh-2rem)] self-start">
            {previewNode}
          </aside>
        )}
      </div>

      {/* Mobile: floating button opens a full-screen preview */}
      {!isDesktop && (
        <button type="button" className="btn-accent fixed bottom-4 right-4 z-30 shadow-lg" onClick={() => setMobilePreview(true)}>
          {w.previewButton}
        </button>
      )}
      {overlayOpen && (
        <div role="dialog" aria-modal="true" aria-label={w.preview} className="fixed inset-0 z-50 flex flex-col gap-3 bg-black/70 p-3">
          <button type="button" className="btn-accent self-end" onClick={() => setMobilePreview(false)}>{w.closePreview}</button>
          <div className="min-h-0 flex-1">{previewNode}</div>
        </div>
      )}
    </div>
  );
}

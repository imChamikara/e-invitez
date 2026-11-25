"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { checkSlug, saveEvent } from "@/app/dashboard/actions";
import { LANG_CODES, siteConfig, type Lang, type PlanKey } from "@/config/site";
import { format, type Dict } from "@/i18n";
import { isValidSlug, normaliseMapsUrl, slugify } from "@/lib/event-utils";
import { compressImage } from "@/lib/image";
import { TEXT_LIMITS, textLength } from "@/lib/limits";
import { featuresFor } from "@/lib/plans";
import { storage } from "@/lib/storage";
import { DEMO_EVENTS } from "@/lib/demo-data";
import { FONT_PAIRS, OCCASION_TYPES } from "@/lib/types";
import { TEMPLATES, getTemplate } from "@/templates/registry";
import { defaultValues, valuesToPayload, valuesToPreview, type EditorValues } from "./editor-types";
import {
  describeField,
  editorFieldFor,
  getRequirements,
  STEPS,
  valueAt,
  type EditorField,
  type FieldTarget,
  type SlugState,
  type Step,
} from "./editor-validation";

const PREVIEW_KEY = "editor-live-preview";
const DESKTOP_QUERY = "(min-width: 1024px)";

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

/** Character count against the server limit (trimmed, as the server counts it). */
function Counter({ value, max }: { value: string; max: number }) {
  const n = textLength(value.trim());
  return <p className={`mt-1 text-right text-sm ${n > max ? "font-semibold text-red-800" : "text-muted"}`}>{n}/{max}</p>;
}

/** A field the server rejected; it stays flagged until its value changes. */
interface ServerIssue extends FieldTarget {
  snapshot: string;
  message: string;
}

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
  const [serverIssues, setServerIssues] = useState<ServerIssue[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);
  const translationsRef = useRef<HTMLDetailsElement>(null);
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

  const requirements = getRequirements(v, slugState, dict);
  const publishReady = requirements.every((r) => r.ok);
  const activeServerIssues = serverIssues.filter((i) => valueAt(v, i.field) === i.snapshot);
  /** Failing browser checks for the mode last attempted, plus anything the server rejected. */
  const failing = attempt ? requirements.filter((r) => !r.ok && (attempt === "publish" || !r.publishOnly)) : [];
  const problems = [
    ...failing,
    ...activeServerIssues
      .filter((i) => !failing.some((r) => r.field === i.field))
      .map((i) => ({ ...i, kind: "server" as const })),
  ];
  const stepsWithProblems = new Set(problems.map((r) => r.step));
  // Length limits are flagged while typing; "required" and the Maps link only after a save attempt.
  const live = requirements.filter((r) => r.kind === "invalid" && r.field !== "mapsUrl");
  const flagged = [...problems, ...live.filter((r) => !problems.some((p) => p.field === r.field))];
  const flaggedKey = JSON.stringify(flagged.map((r) => [r.field, r.kind === "server" ? "server" : r.kind, r.message]));
  const sectionCount = v.sections.length;

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

  // Mirror the flagged fields into react-hook-form so inputs get aria-invalid and their message.
  useEffect(() => {
    clearErrors();
    // Reversed so that when a field fails twice, the first message wins.
    for (const [field, type, message] of (JSON.parse(flaggedKey) as [EditorField, string, string][]).reverse()) {
      setError(field, { type, message });
    }
  }, [flaggedKey, sectionCount, setError, clearErrors]);

  // Open the "other languages" panel when something inside it is wrong.
  const translationFlagged = flagged.some((r) => r.field.startsWith("tr."));
  useEffect(() => {
    if (translationFlagged && translationsRef.current) translationsRef.current.open = true;
  }, [translationFlagged, step]);

  // After navigating: scroll to the top of the editor and focus the new heading, or focus a specific field.
  useEffect(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    const behavior = scrollBehavior();
    if (p.focusId) {
      const el = document.getElementById(p.focusId);
      const panel = el?.closest("details");
      if (panel) panel.open = true;
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

  function removeSection(index: number) {
    // Item numbers shift, so earlier server messages about programme items no longer line up.
    setServerIssues((prev) => prev.filter((i) => !i.field.startsWith("sections")));
    sections.remove(index);
  }

  function cleanMapsUrl() {
    const current = getValues("mapsUrl");
    const cleaned = normaliseMapsUrl(current);
    if (cleaned !== current) setValue("mapsUrl", cleaned, { shouldDirty: true });
  }

  async function save(publish: boolean) {
    setValue("publish", publish);
    setMessage(null);
    setServerIssues([]);
    cleanMapsUrl();
    const mode = publish ? "publish" : "draft";
    if (requirements.some((r) => !r.ok && (publish || !r.publishOnly))) {
      setAttempt(mode);
      setSummaryTick((t) => t + 1);
      return;
    }
    setAttempt(null);
    setSaving(true);
    const result = await saveEvent(eventId ?? null, valuesToPayload(getValues()));
    setSaving(false);
    if (!result.ok) {
      if (result.fields?.length) return showRejected(result.fields, mode);
      const errors = f.errors as unknown as Record<string, string>;
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

  /** Flags the fields the server rejected; paths we can't place are named in a message. */
  function showRejected(paths: string[], mode: "draft" | "publish") {
    const values = getValues();
    const issues = new Map<EditorField, ServerIssue>();
    const unknown: string[] = [];
    for (const path of paths) {
      const field = editorFieldFor(path);
      if (!field) {
        unknown.push(path);
        continue;
      }
      issues.set(field, {
        ...describeField(field, dict),
        snapshot: valueAt(values, field),
        message: field === "mapsUrl" ? f.errors.maps : f.errors.rejected,
      });
    }
    if (unknown.length) setMessage({ kind: "error", text: format(f.errors.unknownField, { field: unknown.join(", ") }) });
    if (issues.size) {
      setAttempt(mode);
      setServerIssues([...issues.values()]);
      setSummaryTick((t) => t + 1);
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
  const slugFormatBad = v.slug !== "" && !isValidSlug(v.slug);
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

  /** aria-invalid and the inline message for one field. */
  const invalidProps = (name: EditorField) => ({ "aria-invalid": Boolean(getFieldState(name, formState).error) });
  const errorFor = (name: EditorField) => {
    const error = getFieldState(name, formState).error;
    return error?.message ? <p role="alert" className="mt-1 text-red-800">{error.message}</p> : null;
  };

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
                const done = visited.has(s) && !current && !stepsWithProblems.has(s) && !requirements.some((r) => r.step === s && !r.ok);
                const hasProblem = stepsWithProblems.has(s);
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
                      {hasProblem && (
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

          {problems.length > 0 && (
            <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-4 outline-none">
              <p className="font-bold text-red-900">
                {format(
                  problems.some((r) => r.kind !== "required") ? w.needFixing : attempt === "publish" ? w.missingPublish : w.missingDraft,
                  { count: problems.length },
                )}
              </p>
              <ul className="mt-2 space-y-1">
                {problems.map((r) => (
                  <li key={`${r.field}-${r.kind}`}>
                    <button type="button" className="tap text-left font-semibold text-red-900 underline" onClick={() => goTo(r.step, r.elementId)}>
                      {r.label}
                      <span className="font-normal no-underline"> · {dict.dash.steps[r.step]}</span>
                      {r.kind !== "required" && <span className="block font-normal">{r.message}</span>}
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
                        id={v.occasionType === o ? "f-occasion" : undefined}
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
                          id={v.templateKey === t.key ? "f-template" : undefined}
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
                  <input id="f-title" className="field" placeholder={f.titleHint} {...invalidProps("title")} {...register("title")} />
                  {errorFor("title")}
                </div>
                <div>
                  <label htmlFor="f-date" className="mb-1 block font-semibold">{f.date}</label>
                  <input id="f-date" type="datetime-local" className="field" {...invalidProps("eventDate")} {...register("eventDate")} />
                  {errorFor("eventDate")}
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="f-venue" className="mb-1 block font-semibold">{f.venueName}</label>
                    <input id="f-venue" className="field" {...invalidProps("venueName")} {...register("venueName")} />
                    {errorFor("venueName")}
                  </div>
                  <div>
                    <label htmlFor="f-addr" className="mb-1 block font-semibold">{f.venueAddress}</label>
                    <input id="f-addr" className="field" {...invalidProps("venueAddress")} {...register("venueAddress")} />
                    {errorFor("venueAddress")}
                  </div>
                </div>
                <div>
                  <label htmlFor="f-maps" className="mb-1 block font-semibold">{f.mapsUrl}</label>
                  <input id="f-maps" type="url" inputMode="url" className="field" placeholder="https://maps.app.goo.gl/…" {...invalidProps("mapsUrl")} {...register("mapsUrl", { onBlur: cleanMapsUrl })} />
                  {errorFor("mapsUrl")}
                  <p className="mt-1 text-sm text-muted">{f.mapsHint}</p>
                </div>
                <div>
                  <label htmlFor="f-story" className="mb-1 block font-semibold">{f.story}</label>
                  <textarea id="f-story" rows={5} className="field" {...invalidProps("story")} {...register("story")} />
                  <Counter value={v.story} max={TEXT_LIMITS.story} />
                  {errorFor("story")}
                </div>
                <div>
                  <label htmlFor="f-lang" className="mb-1 block font-semibold">{f.languageDefault}</label>
                  <select id="f-lang" className="field" {...invalidProps("languageDefault")} {...register("languageDefault")}>
                    {siteConfig.languages.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                  <p className="mt-1 text-sm text-muted">{f.languageHint}</p>
                </div>

                <details ref={translationsRef} className="card p-4">
                  <summary className="tap cursor-pointer font-semibold">{f.otherLanguages}</summary>
                  <div className="mt-4 space-y-6">
                    {otherLangs.map((l) => (
                      <fieldset key={l} className="space-y-3" lang={l}>
                        <legend className="font-bold">{siteConfig.languages.find((x) => x.code === l)?.label}</legend>
                        <div>
                          <input id={`f-tr-${l}-title`} aria-label={f.title} placeholder={f.title} className="field" {...invalidProps(`tr.${l}.title`)} {...register(`tr.${l}.title`)} />
                          {errorFor(`tr.${l}.title`)}
                        </div>
                        <div>
                          <textarea id={`f-tr-${l}-story`} aria-label={f.story} placeholder={f.story} rows={3} className="field" {...invalidProps(`tr.${l}.story`)} {...register(`tr.${l}.story`)} />
                          <Counter value={v.tr[l].story} max={TEXT_LIMITS.story} />
                          {errorFor(`tr.${l}.story`)}
                        </div>
                        <div>
                          <input id={`f-tr-${l}-venue`} aria-label={f.venueName} placeholder={f.venueName} className="field" {...invalidProps(`tr.${l}.venueName`)} {...register(`tr.${l}.venueName`)} />
                          {errorFor(`tr.${l}.venueName`)}
                        </div>
                        <div>
                          <input id={`f-tr-${l}-addr`} aria-label={f.venueAddress} placeholder={f.venueAddress} className="field" {...invalidProps(`tr.${l}.venueAddress`)} {...register(`tr.${l}.venueAddress`)} />
                          {errorFor(`tr.${l}.venueAddress`)}
                        </div>
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
                {errorFor("photos")}
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
                          {...invalidProps(`sections.${i}.title`)}
                          {...register(`sections.${i}.title`)}
                        />
                        {errorFor(`sections.${i}.title`)}
                      </div>
                      <div>
                        <input id={`f-sec-${i}-time`} aria-label={f.itemTime} type="datetime-local" className="field" {...invalidProps(`sections.${i}.startsAt`)} {...register(`sections.${i}.startsAt`)} />
                        {errorFor(`sections.${i}.startsAt`)}
                      </div>
                      <div>
                        <input id={`f-sec-${i}-desc`} aria-label={f.itemDesc} placeholder={f.itemDesc} className="field" {...invalidProps(`sections.${i}.description`)} {...register(`sections.${i}.description`)} />
                        <Counter value={v.sections[i]?.description ?? ""} max={TEXT_LIMITS.sectionDescription} />
                        {errorFor(`sections.${i}.description`)}
                      </div>
                      {otherLangs.map((l) => (
                        <div key={l}>
                          <input id={`f-sec-${i}-tr-${l}`} lang={l} aria-label={`${f.itemTitle} (${l})`} placeholder={`${siteConfig.languages.find((x) => x.code === l)?.label}: ${f.itemTitle}`} className="field" {...invalidProps(`sections.${i}.titleTr.${l}`)} {...register(`sections.${i}.titleTr.${l}`)} />
                          {errorFor(`sections.${i}.titleTr.${l}`)}
                        </div>
                      ))}
                      <button type="button" className="tap text-red-800 underline" onClick={() => removeSection(i)}>{f.removeItem}</button>
                    </li>
                  ))}
                </ul>
                <button
                  id="f-sec-add"
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
                      aria-invalid={Boolean(getFieldState("slug", formState).error) || slugState === "bad"}
                      {...register("slug", { onChange: () => setSlugTouched(true) })}
                    />
                  </div>
                  <p className="mt-1 text-sm text-muted">{f.slugHint}</p>
                  {(v.slug === "" || getFieldState("slug", formState).error?.type === "server") && errorFor("slug")}
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
                  <input id="f-pw" type="text" autoComplete="off" disabled={!features.passwordProtection} className="field" {...invalidProps("password")} {...register("password")} />
                  {errorFor("password")}
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
                    {requirements.filter((r) => r.kind === "required" || !r.ok).map((r) => (
                      <li key={`${r.field}-${r.kind}`}>
                        {r.ok ? (
                          <span className="font-semibold text-green-800">✓ {r.label}</span>
                        ) : (
                          <button type="button" className="tap text-left font-semibold text-red-800 underline" onClick={() => goTo(r.step, r.elementId)}>
                            ✗ {r.label}
                            {r.kind === "invalid" && <span className="block font-normal">{r.message}</span>}
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

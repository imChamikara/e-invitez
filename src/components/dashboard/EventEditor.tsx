"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const { register, control, setValue, getValues, trigger, formState } = form;
  const sections = useFieldArray({ control, name: "sections" });

  const [step, setStep] = useState<Step>(editing ? "details" : "occasion");
  const [slugState, setSlugState] = useState<"idle" | "checking" | "ok" | "bad">("idle");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const v = useWatch({ control }) as EditorValues;
  const stepIndex = STEPS.indexOf(step);

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

  // Cheap enough to rebuild each render; only computed in full when the preview is open.
  const preview = {
    ...valuesToPreview(v, DEMO_EVENTS[v.templateKey] ?? DEMO_EVENTS["classic-wedding"]),
    plan,
  };

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
    if (!(await trigger(["title", "slug"])) || slugState === "bad") {
      setMessage({ kind: "error", text: f.errors.invalid });
      return;
    }
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

  function next() {
    if (step === "details") {
      trigger("title").then((ok) => ok && setStep(STEPS[stepIndex + 1]));
      return;
    }
    setStep(STEPS[stepIndex + 1]);
  }

  const otherLangs = LANG_CODES.filter((l) => l !== v.languageDefault);
  const suggested = TEMPLATES.filter((t) => t.occasions.includes(v.occasionType));
  const ordered = [...suggested, ...TEMPLATES.filter((t) => !suggested.includes(t))];
  const Preview = getTemplate(v.templateKey).Component;

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <ol className="flex flex-wrap gap-2" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => (editing || i <= stepIndex) && setStep(s)}
              aria-current={s === step ? "step" : undefined}
              className={`tap rounded-full px-4 text-base font-semibold ${s === step ? "bg-brand text-white" : "bg-brand-soft text-brand-dark"}`}
            >
              {i + 1}. {dict.dash.steps[s]}
            </button>
          </li>
        ))}
      </ol>

      {step === "occasion" && (
        <fieldset className="space-y-3">
          <legend className="mb-2 text-2xl font-bold">{w.pickOccasion}</legend>
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
        </fieldset>
      )}

      {step === "template" && (
        <fieldset className="space-y-3">
          <legend className="mb-1 text-2xl font-bold">{w.pickTemplate}</legend>
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
        </fieldset>
      )}

      {step === "details" && (
        <div className="space-y-5">
          <h2 className="text-2xl font-bold">{w.detailsTitle}</h2>
          <div>
            <label htmlFor="f-title" className="mb-1 block font-semibold">{f.title}</label>
            <input id="f-title" className="field" placeholder={f.titleHint} aria-invalid={Boolean(formState.errors.title)} {...register("title", { required: true, maxLength: 160 })} />
            {formState.errors.title && <p role="alert" className="mt-1 text-red-800">{f.required}</p>}
          </div>
          <div>
            <label htmlFor="f-date" className="mb-1 block font-semibold">{f.date}</label>
            <input id="f-date" type="datetime-local" className="field" {...register("eventDate")} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="f-venue" className="mb-1 block font-semibold">{f.venueName}</label>
              <input id="f-venue" className="field" {...register("venueName")} />
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
          <h2 className="text-2xl font-bold">{w.photosTitle}</h2>
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
          <h2 className="text-2xl font-bold">{w.timelineTitle}</h2>
          <ul className="space-y-4">
            {sections.fields.map((field, i) => (
              <li key={field.id} className="card space-y-3 p-4">
                <input aria-label={f.itemTitle} placeholder={f.itemTitle} className="field" {...register(`sections.${i}.title`, { required: true })} />
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
          <h2 className="text-2xl font-bold">{w.publishTitle}</h2>
          <div>
            <label htmlFor="f-slug" className="mb-1 block font-semibold">{f.slug}</label>
            <div className="flex items-center gap-2">
              <span className="text-muted">/e/</span>
              <input
                id="f-slug"
                className="field"
                autoCapitalize="none"
                {...register("slug", { required: true, pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/, minLength: 3, maxLength: 60, onChange: () => setSlugTouched(true) })}
              />
            </div>
            <p className="mt-1 text-sm text-muted">{f.slugHint}</p>
            <p aria-live="polite" className={`mt-1 font-semibold ${slugState === "ok" ? "text-green-800" : slugState === "bad" ? "text-red-800" : "text-muted"}`}>
              {slugState === "checking" && f.slugChecking}
              {slugState === "ok" && `✓ ${f.slugOk}`}
              {slugState === "bad" && (formState.errors.slug ? f.slugInvalid : f.slugTaken)}
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

          <label className="tap flex items-center gap-3 font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-[var(--brand)]" {...register("publish")} />
            {f.publishNow}
          </label>
        </div>
      )}

      {/* Live preview */}
      {step !== "occasion" && (
        <div>
          <button type="button" className="btn-outline" aria-expanded={showPreview} onClick={() => setShowPreview((s) => !s)}>
            {w.preview}
          </button>
          {showPreview && (
            <div inert aria-hidden="true" className="pointer-events-none mx-auto mt-3 max-h-[70vh] max-w-sm overflow-y-auto rounded-2xl border-4 border-ink">
              <Preview event={{ ...preview, id: "preview" }} lang={lang} dict={dict} guest={null} demo showBranding={!features.removeBranding} />
            </div>
          )}
        </div>
      )}

      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`rounded-xl p-3 font-semibold ${message.kind === "error" ? "bg-red-50 text-red-800" : "bg-green-50 text-green-900"}`}>
          {message.text}
        </p>
      )}

      <div className="flex flex-wrap gap-3 border-t border-line pt-4">
        {stepIndex > 0 && !editing && (
          <button type="button" className="btn-outline" onClick={() => setStep(STEPS[stepIndex - 1])}>{dict.common.back}</button>
        )}
        {stepIndex < STEPS.length - 1 && !editing && (
          <button type="button" className="btn-accent" onClick={next}>{dict.common.next}</button>
        )}
        {(editing || step === "publish") && (
          <button type="button" disabled={saving || uploading} className="btn-accent disabled:opacity-60" onClick={() => save(getValues("publish"))}>
            {saving ? f.saving : editing ? f.saveChanges : v.publish ? f.publishNow : f.saveDraft}
          </button>
        )}
      </div>
    </div>
  );
}

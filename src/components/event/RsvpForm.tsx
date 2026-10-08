"use client";

import { useActionState, useState } from "react";
import { submitRsvp, type FormState } from "@/app/e/[slug]/actions";
import { MEAL_OPTIONS, type GuestInfo } from "@/lib/types";
import type { Dict } from "@/i18n";

const idle: FormState = { status: "idle" };

/** Demo mode: behave like a successful submission without touching the server. */
async function demoAction(_prev: FormState, fd: FormData): Promise<FormState> {
  return { status: "ok", attending: fd.get("attending") === "yes" };
}

export function RsvpForm({
  slug,
  guest,
  demo,
  labels,
}: {
  slug: string;
  guest: GuestInfo | null;
  demo: boolean;
  labels: Dict["event"]["rsvp"];
}) {
  const [state, action, pending] = useActionState(demo ? demoAction : submitRsvp, idle);
  const [attending, setAttending] = useState<"yes" | "no">("yes");
  const [again, setAgain] = useState(false);

  if (state.status === "ok" && !again) {
    return (
      <div className="card p-6 text-center" role="status">
        <p className="heading-font text-2xl">{state.attending ? labels.thanksYes : labels.thanksNo}</p>
        {demo && <p className="mt-2 text-sm text-muted">{labels.demoNote}</p>}
        <button type="button" onClick={() => setAgain(true)} className="btn-outline mt-4">
          {labels.again}
        </button>
      </div>
    );
  }

  const maxSize = Math.max(10, guest?.expectedCount ?? 0);
  return (
    <form
      action={(fd) => {
        setAgain(false);
        action(fd);
      }}
      className="card space-y-5 p-5"
    >
      <input type="hidden" name="slug" value={slug} />
      {guest && <input type="hidden" name="guestToken" value={guest.token} />}
      {/* Honeypot: hidden from people, filled by bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <p className="text-muted">{labels.intro}</p>

      <div>
        <label htmlFor="rsvp-name" className="mb-1 block font-semibold">{labels.name}</label>
        <input id="rsvp-name" name="name" required maxLength={120} defaultValue={guest?.name ?? ""} autoComplete="name" className="field" />
      </div>

      <fieldset>
        <legend className="mb-2 font-semibold">{labels.attending}</legend>
        <div className="grid gap-2">
          {(["yes", "no"] as const).map((v) => (
            <label
              key={v}
              className={`tap flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 ${
                attending === v ? "border-accent bg-alt" : "border-line"
              }`}
            >
              <input
                type="radio"
                name="attending"
                value={v}
                checked={attending === v}
                onChange={() => setAttending(v)}
                className="h-5 w-5 accent-[var(--accent)]"
              />
              <span>{v === "yes" ? labels.yes : labels.no}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {attending === "yes" && (
        <>
          <div>
            <label htmlFor="rsvp-size" className="mb-1 block font-semibold">{labels.partySize}</label>
            <select id="rsvp-size" name="partySize" defaultValue={guest?.expectedCount ?? 1} className="field">
              {Array.from({ length: maxSize }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="rsvp-meal" className="mb-1 block font-semibold">{labels.meal}</label>
            <select id="rsvp-meal" name="meal" defaultValue="any" className="field">
              {MEAL_OPTIONS.map((m) => (
                <option key={m} value={m}>{labels.meals[m]}</option>
              ))}
            </select>
          </div>
        </>
      )}

      <div>
        <label htmlFor="rsvp-msg" className="mb-1 block font-semibold">{labels.message}</label>
        <textarea id="rsvp-msg" name="message" rows={3} maxLength={500} className="field" />
      </div>

      {state.status === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 font-medium text-red-800">
          {state.code === "invalid" ? labels.invalid : state.code === "closed" ? labels.closed : labels.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-accent w-full disabled:opacity-60">
        {pending ? labels.sending : labels.submit}
      </button>
      {demo && <p className="text-center text-sm text-muted">{labels.demoNote}</p>}
    </form>
  );
}

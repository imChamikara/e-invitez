"use client";

import { useActionState } from "react";
import { submitWish, type FormState } from "@/app/e/[slug]/actions";
import type { Dict } from "@/i18n";

const idle: FormState = { status: "idle" };

async function demoAction(): Promise<FormState> {
  return { status: "ok" };
}

export function WishForm({ slug, demo, labels }: { slug: string; demo: boolean; labels: Dict["event"]["wishes"] }) {
  const [state, action, pending] = useActionState(demo ? demoAction : submitWish, idle);

  if (state.status === "ok") {
    return (
      <p className="card p-5 text-center font-semibold" role="status">
        {labels.thanks}
        {demo && <span className="mt-1 block text-sm font-normal text-muted">{labels.demoNote}</span>}
      </p>
    );
  }
  return (
    <form action={action} className="card space-y-4 p-5">
      <input type="hidden" name="slug" value={slug} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <div>
        <label htmlFor="wish-name" className="mb-1 block font-semibold">{labels.name}</label>
        <input id="wish-name" name="name" required maxLength={80} autoComplete="name" className="field" />
      </div>
      <div>
        <label htmlFor="wish-msg" className="mb-1 block font-semibold">{labels.message}</label>
        <textarea id="wish-msg" name="message" required rows={3} maxLength={500} className="field" />
      </div>
      {state.status === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 font-medium text-red-800">{labels.error}</p>
      )}
      <button type="submit" disabled={pending} className="btn-accent w-full disabled:opacity-60">
        {pending ? labels.sending : labels.submit}
      </button>
    </form>
  );
}

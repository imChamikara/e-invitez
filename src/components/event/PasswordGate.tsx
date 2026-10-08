"use client";

import { useActionState } from "react";
import { unlockEvent } from "@/app/e/[slug]/actions";
import type { Dict } from "@/i18n";

export function PasswordGate({ slug, guestToken, labels }: { slug: string; guestToken?: string; labels: Dict["event"]["gate"] }) {
  const [state, action, pending] = useActionState(unlockEvent, { wrong: false });
  return (
    <form action={action} className="card mx-auto w-full max-w-sm space-y-4 p-6 text-center">
      <input type="hidden" name="slug" value={slug} />
      {guestToken && <input type="hidden" name="g" value={guestToken} />}
      <h1 className="heading-font text-2xl">🔒 {labels.title}</h1>
      <p className="text-muted">{labels.text}</p>
      <div className="text-left">
        <label htmlFor="gate-pw" className="mb-1 block font-semibold">{labels.password}</label>
        <input id="gate-pw" name="password" type="password" required autoComplete="current-password" className="field" />
      </div>
      {state.wrong && <p role="alert" className="font-medium text-red-800">{labels.wrong}</p>}
      <button type="submit" disabled={pending} className="btn-accent w-full disabled:opacity-60">{labels.unlock}</button>
    </form>
  );
}

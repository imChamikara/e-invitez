"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Dict } from "@/i18n";
import { format } from "@/i18n";

export function LoginForm({ labels, google }: { labels: Dict["dash"]["login"]; google: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setState(error ? "error" : "sent");
  }

  async function withGoogle() {
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  if (state === "sent") {
    return (
      <p role="status" className="rounded-xl bg-green-50 p-4 text-lg font-medium text-green-900">
        {format(labels.sent, { email })}
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <form onSubmit={sendLink} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="mb-1 block font-semibold">{labels.email}</label>
          <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
        </div>
        {state === "error" && <p role="alert" className="font-medium text-red-800">{labels.error}</p>}
        <button type="submit" disabled={state === "sending"} className="btn-accent w-full disabled:opacity-60">
          {state === "sending" ? labels.sending : labels.send}
        </button>
      </form>
      {google && (
        <button type="button" onClick={withGoogle} className="btn-outline w-full">{labels.google}</button>
      )}
    </div>
  );
}

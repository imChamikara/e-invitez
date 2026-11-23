"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Dict } from "@/i18n";
import { format } from "@/i18n";

type Step = "email" | "code";

export function LoginForm({
  labels,
  google,
  initialError,
}: {
  labels: Dict["dash"]["login"];
  google: boolean;
  initialError?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  async function sendCode() {
    setBusy(true);
    setError(null);
    const { error: err } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (err) {
      console.error(err);
      setError(`${labels.error} (${err.message})`);
      return;
    }
    setStep("code");
  }

  async function onSendCode(e: React.FormEvent) {
    e.preventDefault();
    await sendCode();
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await createClient().auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    if (err) {
      setBusy(false);
      setError(labels.codeError);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  function changeEmail() {
    setStep("email");
    setCode("");
    setError(null);
  }

  async function withGoogle() {
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="space-y-4">
      {step === "email" ? (
        <form onSubmit={onSendCode} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1 block font-semibold">{labels.email}</label>
            <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
          </div>
          {error && <p role="alert" className="font-medium text-red-800">{error}</p>}
          <button type="submit" disabled={busy} className="btn-accent w-full disabled:opacity-60">
            {busy ? labels.sending : labels.send}
          </button>
        </form>
      ) : (
        <form onSubmit={onVerify} className="space-y-4">
          <p role="status" className="rounded-xl bg-green-50 p-4 text-lg font-medium text-green-900">
            {format(labels.codeSent, { email: email.trim() })}
          </p>
          <div>
            <label htmlFor="login-code" className="mb-1 block font-semibold">{labels.code}</label>
            <input
              id="login-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,10}"
              minLength={6}
              maxLength={10}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="field text-center text-3xl tracking-[0.4em]"
            />
          </div>
          {error && <p role="alert" className="font-medium text-red-800">{error}</p>}
          <button type="submit" disabled={busy || code.length < 6} className="btn-accent w-full disabled:opacity-60">
            {busy ? labels.verifying : labels.verify}
          </button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={sendCode} disabled={busy} className="btn-outline w-full disabled:opacity-60">{labels.resend}</button>
            <button type="button" onClick={changeEmail} disabled={busy} className="btn-outline w-full disabled:opacity-60">{labels.changeEmail}</button>
          </div>
        </form>
      )}
      {google && (
        <button type="button" onClick={withGoogle} className="btn-outline w-full">{labels.google}</button>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/dashboard/LoginForm";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { siteConfig } from "@/config/site";
import { getI18n } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage() {
  const { lang, dict } = await getI18n();
  const l = dict.dash.login;
  const configured = hasSupabase();

  if (configured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <Link href="/" className="heading-font text-2xl font-bold text-brand">{siteConfig.name}</Link>
        <LanguageSwitcher current={lang} label={dict.common.language} />
      </div>
      <div className="card p-6">
        <h1 className="mb-2 text-2xl font-bold">{l.title}</h1>
        <p className="mb-5 text-muted">{l.text}</p>
        {configured ? (
          <LoginForm labels={l} google={process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true"} />
        ) : (
          <p className="rounded-xl bg-amber-50 p-4 font-medium text-amber-900">{l.setup}</p>
        )}
      </div>
    </main>
  );
}

import Link from "next/link";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { siteConfig } from "@/config/site";
import { format } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { signOut } from "./actions";

export const metadata = { robots: { index: false } };

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const { plan } = await requireUser();
  const { lang, dict } = await getI18n();
  const n = dict.dash.nav;
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3">{dict.common.skipToContent}</a>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <Link href="/dashboard" className="heading-font tap inline-flex items-center text-xl font-bold text-brand">{siteConfig.name}</Link>
          <nav className="flex flex-wrap items-center gap-2 text-base">
            <Link href="/dashboard/new" className="tap inline-flex items-center px-2 font-semibold underline">{n.new}</Link>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand-dark">
              {format(n.plan, { plan: dict.dash.plans[plan] })}
            </span>
            <LanguageSwitcher current={lang} label={dict.common.language} />
            <form action={signOut}>
              <button type="submit" className="tap px-2 underline">{n.signOut}</button>
            </form>
          </nav>
        </div>
      </header>
      <div id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</div>
    </>
  );
}

import Link from "next/link";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { siteConfig } from "@/config/site";
import { getI18n } from "@/i18n/server";
import { TEMPLATES } from "@/templates/registry";

export default async function Home() {
  const { lang, dict } = await getI18n();
  const t = dict.landing;
  const nav = [
    ["#templates", t.nav.templates],
    ["#features", t.nav.features],
    ["#pricing", t.nav.pricing],
    ["#faq", t.nav.faq],
  ];

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3">{dict.common.skipToContent}</a>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <Link href="/" className="heading-font tap inline-flex items-center text-2xl font-bold text-brand">{siteConfig.name}</Link>
          <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
            {nav.map(([href, label]) => (
              <a key={href} href={href} className="tap hidden items-center px-3 font-medium md:inline-flex">{label}</a>
            ))}
            <LanguageSwitcher current={lang} label={dict.common.language} />
            <Link href="/login" className="tap inline-flex items-center px-3 font-semibold underline">{t.nav.login}</Link>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="px-4 py-16 text-center" style={{ background: "linear-gradient(180deg, var(--brand-soft), var(--paper))" }}>
          <div className="mx-auto max-w-2xl">
            <p aria-hidden="true" className="text-4xl">💐 💍 🎂 🪷</p>
            <h1 className="heading-font mt-4 text-balance text-4xl font-bold leading-tight sm:text-5xl">{t.hero.title}</h1>
            <p className="mt-4 text-lg text-muted sm:text-xl">{t.hero.subtitle}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/dashboard/new" className="btn-accent text-lg">{t.hero.cta}</Link>
              <Link href="/demo" className="btn-outline text-lg">{t.hero.demo}</Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-4 py-14" aria-labelledby="how-title">
          <div className="mx-auto max-w-4xl">
            <h2 id="how-title" className="heading-font mb-8 text-center text-3xl font-bold">{t.how.title}</h2>
            <ol className="grid gap-4 md:grid-cols-3">
              {t.how.steps.map((s, i) => (
                <li key={s.t} className="card p-5">
                  <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand text-xl font-bold text-white">{i + 1}</span>
                  <h3 className="text-xl font-semibold">{s.t}</h3>
                  <p className="mt-1 text-muted">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Template gallery */}
        <section id="templates" className="bg-brand-soft px-4 py-14" aria-labelledby="tpl-title">
          <div className="mx-auto max-w-4xl">
            <h2 id="tpl-title" className="heading-font text-center text-3xl font-bold">{t.templates.title}</h2>
            <p className="mb-8 mt-2 text-center text-muted">{t.templates.subtitle}</p>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TEMPLATES.map((tpl) => {
                const meta = dict.common.templates[tpl.key as keyof typeof dict.common.templates];
                return (
                  <li key={tpl.key}>
                    <Link
                      href={`/demo/${tpl.key}`}
                      className="block h-full overflow-hidden rounded-2xl border border-line bg-white shadow-sm hover:shadow-md"
                    >
                      <div aria-hidden="true" className="h-24" style={{ background: `linear-gradient(135deg, ${tpl.defaultTheme.accent}, #1c1917 160%)` }} />
                      <div className="p-4">
                        <h3 className="text-lg font-semibold">{meta?.name ?? tpl.key}</h3>
                        <p className="text-muted">{meta?.desc}</p>
                        <span className="mt-2 inline-block font-semibold text-brand">{t.templates.view} →</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-4 py-14" aria-labelledby="feat-title">
          <div className="mx-auto max-w-4xl">
            <h2 id="feat-title" className="heading-font mb-8 text-center text-3xl font-bold">{t.features.title}</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {t.features.items.map((f) => (
                <li key={f.t} className="card p-5">
                  <h3 className="text-lg font-semibold">{f.t}</h3>
                  <p className="mt-1 text-muted">{f.d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="bg-brand-soft px-4 py-14" aria-labelledby="price-title">
          <div className="mx-auto max-w-4xl">
            <h2 id="price-title" className="heading-font text-center text-3xl font-bold">{t.pricing.title}</h2>
            <p className="mb-8 mt-2 text-center text-muted">{t.pricing.subtitle}</p>
            <ul className="grid gap-4 md:grid-cols-3">
              {siteConfig.pricing.plans.map((p) => {
                const plan = t.pricing.plans[p.key];
                return (
                  <li key={p.key} className={`card flex flex-col p-5 ${p.key === "standard" ? "ring-2 ring-brand" : ""}`}>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className="mt-2 text-3xl font-bold text-brand">
                      {p.price === 0 ? t.pricing.free : `${siteConfig.pricing.currency} ${p.price.toLocaleString("en-LK")}`}
                    </p>
                    {p.price > 0 && <p className="text-sm text-muted">{t.pricing.per}</p>}
                    <ul className="my-4 flex-1 space-y-1">
                      {plan.features.map((f) => <li key={f}>✓ {f}</li>)}
                    </ul>
                    <Link href="/dashboard/new" className={p.key === "standard" ? "btn-accent" : "btn-outline"}>{t.pricing.start}</Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="px-4 py-14" aria-labelledby="faq-title">
          <div className="mx-auto max-w-2xl">
            <h2 id="faq-title" className="heading-font mb-8 text-center text-3xl font-bold">{t.faq.title}</h2>
            <div className="space-y-3">
              {t.faq.items.map((item) => (
                <details key={item.q} className="card group p-4">
                  <summary className="tap cursor-pointer text-lg font-semibold">{item.q}</summary>
                  <p className="mt-2 text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-ink px-4 py-8 text-center text-white">
        <p className="heading-font text-xl font-bold">{siteConfig.name}</p>
        <p className="mt-1 text-stone-300">{t.footer.tagline}</p>
        <p className="mt-3 text-sm text-stone-400">© {new Date().getFullYear()} {siteConfig.name}. {t.footer.rights}</p>
      </footer>
    </>
  );
}

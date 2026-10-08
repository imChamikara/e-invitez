import type { Metadata } from "next";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { getI18n } from "@/i18n/server";
import { DEMO_EVENTS } from "@/lib/demo-data";
import { TEMPLATES } from "@/templates/registry";

export const metadata: Metadata = { title: "Demo" };

export default async function DemoIndex() {
  const { lang, dict } = await getI18n();
  const c = dict.common;
  const keys = Object.keys(DEMO_EVENTS);
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{c.demo.title}</h1>
        <LanguageSwitcher current={lang} label={c.language} />
      </div>
      <p className="mb-6 text-lg text-muted">{c.demo.subtitle}</p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {keys.map((key) => {
          const tpl = c.templates[key as keyof typeof c.templates];
          const def = TEMPLATES.find((t) => t.key === key);
          return (
            <li key={key}>
              <Link
                href={`/demo/${key}`}
                className="block rounded-2xl border border-line bg-white p-5 shadow-sm hover:shadow-md"
                style={{ borderTop: `6px solid ${def?.defaultTheme.accent ?? "#9a3412"}` }}
              >
                <h2 className="text-xl font-semibold">{tpl.name}</h2>
                <p className="mt-1 text-muted">{tpl.desc}</p>
                <span className="mt-3 inline-block font-semibold text-brand">{c.demo.preview} →</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

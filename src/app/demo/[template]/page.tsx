import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { DEMO_EVENTS } from "@/lib/demo-data";
import { localizeEvent } from "@/lib/event-utils";
import { getTemplate } from "@/templates/registry";

export async function generateMetadata({ params }: PageProps<"/demo/[template]">): Promise<Metadata> {
  const { template } = await params;
  const event = DEMO_EVENTS[template];
  return { title: event ? `Demo · ${event.title}` : "Demo", robots: { index: false } };
}

export default async function DemoTemplate({ params }: PageProps<"/demo/[template]">) {
  const { template } = await params;
  const raw = DEMO_EVENTS[template];
  if (!raw) notFound();

  const { lang, dict } = await getI18n(raw.languageDefault);
  const event = localizeEvent(raw, lang);
  const { Component } = getTemplate(raw.templateKey);

  return (
    <>
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 bg-ink px-3 py-2 text-sm text-white">
        <Link href="/demo" className="tap inline-flex items-center underline">
          ← {dict.common.demo.backToGallery}
        </Link>
        <span>{dict.common.demo.banner}</span>
      </div>
      <Component event={event} lang={lang} dict={dict} guest={null} demo showBranding />
    </>
  );
}

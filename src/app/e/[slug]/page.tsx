import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PasswordGate } from "@/components/event/PasswordGate";
import { siteConfig } from "@/config/site";
import { format } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { eventUrl, localizeEvent } from "@/lib/event-utils";
import { getEventBySlug, getGuestByToken } from "@/lib/events";
import { formatLongDate } from "@/lib/format";
import { featuresFor } from "@/lib/plans";
import { hasSupabase } from "@/lib/supabase/env";
import { isUnlocked } from "@/lib/unlock";
import { getTemplate } from "@/templates/registry";

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const raw = await getEventBySlug(slug);
  if (!raw) return { title: siteConfig.name, robots: { index: false } };

  const event = localizeEvent(raw, raw.languageDefault);
  const when = event.eventDate ? formatLongDate(event.eventDate, event.languageDefault) : "";
  const description = [when, event.venueName].filter(Boolean).join(" · ") || event.story.slice(0, 150);
  const hidden = raw.isPrivate || raw.hasPassword || !raw.isPublished;
  return {
    title: event.title,
    description,
    alternates: { canonical: eventUrl(slug) },
    robots: hidden ? { index: false, follow: false } : undefined,
    openGraph: { title: event.title, description, type: "website", url: eventUrl(slug), siteName: siteConfig.name },
    twitter: { card: "summary_large_image", title: event.title, description },
  };
}

export default async function EventPage({ params, searchParams }: PageProps<"/e/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const token = typeof sp.g === "string" ? sp.g : undefined;

  if (!hasSupabase()) return <SetupNeeded />;

  const raw = await getEventBySlug(slug);
  if (!raw) notFound();

  const { lang, dict } = await getI18n(raw.languageDefault);

  if (raw.hasPassword && raw.isPublished && !(await isUnlocked(slug))) {
    return (
      <main className="flex flex-1 items-center justify-center p-4" lang={lang}>
        <PasswordGate slug={slug} guestToken={token} labels={dict.event.gate} />
      </main>
    );
  }

  const event = localizeEvent(raw, lang);
  const guest = token ? await getGuestByToken(slug, token) : null;
  const { Component } = getTemplate(raw.templateKey);

  return (
    <Component
      event={event}
      lang={lang}
      dict={dict}
      guest={guest}
      demo={false}
      showBranding={!featuresFor(raw.plan).removeBranding}
    />
  );
}

async function SetupNeeded() {
  const { dict } = await getI18n();
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold">{dict.common.setupNeeded.title}</h1>
      <p className="text-muted">{dict.common.setupNeeded.text}</p>
      <Link href="/demo" className="btn-accent bg-brand">{format("{x}", { x: dict.common.demo.title })}</Link>
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { EventActions } from "@/components/dashboard/EventActions";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { eventUrl } from "@/lib/event-utils";

export default async function ManageLayout({ children, params }: LayoutProps<"/dashboard/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { dict } = await getI18n();
  const m = dict.dash.manage;
  const { data: event } = await supabase.from("events").select("id, slug, title, is_published").eq("id", id).maybeSingle();
  if (!event) notFound();

  const tabs = [
    { href: `/dashboard/${id}`, label: m.edit },
    { href: `/dashboard/${id}/guests`, label: m.guests },
    { href: `/dashboard/${id}/rsvps`, label: m.rsvps },
    { href: `/dashboard/${id}/wishes`, label: m.wishes },
  ];

  return (
    <div className="space-y-5">
      <Link href="/dashboard" className="tap inline-flex items-center underline">{m.back}</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{event.title}</h1>
          <p className="mt-1 break-all text-muted">
            {m.shareLink}: <Link className="underline" href={`/e/${event.slug}`}>{eventUrl(event.slug)}</Link>
          </p>
        </div>
        <EventActions eventId={id} published={event.is_published} labels={m} />
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="Event">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="tap inline-flex items-center rounded-full bg-brand-soft px-4 font-semibold text-brand-dark">{t.label}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}

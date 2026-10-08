import { notFound } from "next/navigation";
import { eventToValues } from "@/components/dashboard/editor-types";
import { EventEditor } from "@/components/dashboard/EventEditor";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { EVENT_COLUMNS, mapEvent, type EventRow, type SectionRow } from "@/lib/events";

export default async function EditEventPage({ params }: PageProps<"/dashboard/[id]">) {
  const { id } = await params;
  const { supabase, user, plan } = await requireUser();
  const { lang, dict } = await getI18n();

  const { data } = await supabase
    .from("events")
    .select(`${EVENT_COLUMNS}, event_sections(id, title, starts_at, description, translations, sort_order), event_photos(id, url, sort_order)`)
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  const { event_sections, event_photos, ...row } = data as unknown as EventRow & {
    event_sections: SectionRow[];
    event_photos: { id: string; url: string; sort_order: number }[];
  };
  const event = mapEvent(row, { sections: event_sections, photos: event_photos, plan });

  return <EventEditor dict={dict} lang={lang} userId={user.id} plan={plan} eventId={id} initial={eventToValues(event)} />;
}

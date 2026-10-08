import { notFound } from "next/navigation";
import { GuestManager } from "@/components/dashboard/GuestManager";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { eventUrl } from "@/lib/event-utils";
import { featuresFor } from "@/lib/plans";

export default async function GuestsPage({ params }: PageProps<"/dashboard/[id]/guests">) {
  const { id } = await params;
  const { supabase, plan } = await requireUser();
  const { dict } = await getI18n();

  const { data: event } = await supabase.from("events").select("slug, title").eq("id", id).maybeSingle();
  if (!event) notFound();

  const [{ data: guests }, { data: rsvps }] = await Promise.all([
    supabase.from("guests").select("id, name, token, expected_count, phone").eq("event_id", id).order("name"),
    supabase.from("rsvps").select("guest_id").eq("event_id", id).not("guest_id", "is", null),
  ]);
  const replied = new Set((rsvps ?? []).map((r) => r.guest_id));

  return (
    <>
      <h2 className="mb-3 text-2xl font-bold">{dict.dash.guests.title}</h2>
      <GuestManager
        eventId={id}
        title={event.title}
        baseUrl={eventUrl(event.slug)}
        guests={(guests ?? []).map((g) => ({ ...g, replied: replied.has(g.id) }))}
        maxGuests={featuresFor(plan).maxGuests}
        labels={dict.dash.guests}
      />
    </>
  );
}

import { notFound } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { featuresFor } from "@/lib/plans";

interface RsvpRow {
  id: string;
  guest_id: string | null;
  name: string;
  attending: boolean;
  party_size: number;
  meal_preference: string;
  message: string;
  created_at: string;
}

export default async function RsvpsPage({ params }: PageProps<"/dashboard/[id]/rsvps">) {
  const { id } = await params;
  const { supabase, plan } = await requireUser();
  const { lang, dict } = await getI18n();
  const r = dict.dash.rsvps;

  const { data: event } = await supabase.from("events").select("id").eq("id", id).maybeSingle();
  if (!event) notFound();

  const { data } = await supabase.from("rsvps").select("*").eq("event_id", id).order("created_at", { ascending: false });
  // A guest who replies twice counts once: keep their newest reply (rows are newest-first).
  const seen = new Set<string>();
  const rows = ((data ?? []) as RsvpRow[]).filter((x) => {
    if (!x.guest_id) return true;
    if (seen.has(x.guest_id)) return false;
    seen.add(x.guest_id);
    return true;
  });

  const yes = rows.filter((x) => x.attending);
  const headcount = yes.reduce((n, x) => n + x.party_size, 0);
  const meals: Record<string, number> = {};
  for (const x of yes) meals[x.meal_preference] = (meals[x.meal_preference] ?? 0) + x.party_size;
  const canExport = featuresFor(plan).csvExport;

  const stats = [
    [r.responses, rows.length],
    [r.attending, yes.length],
    [r.declined, rows.length - yes.length],
    [r.headcount, headcount],
  ] as const;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{r.title}</h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="card p-4 text-center">
            <dd className="text-3xl font-bold text-brand">{value}</dd>
            <dt className="text-sm text-muted">{label}</dt>
          </div>
        ))}
      </dl>

      {Object.keys(meals).length > 0 && (
        <div className="card p-4">
          <h3 className="mb-2 font-semibold">{r.meals}</h3>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(meals).map(([k, n]) => (
              <li key={k} className="rounded-full bg-brand-soft px-3 py-1 font-semibold">
                {dict.event.rsvp.meals[k as keyof typeof dict.event.rsvp.meals] ?? k}: {n}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canExport ? (
        <a href={`/dashboard/${id}/rsvps/export`} className="btn-outline">{r.export}</a>
      ) : (
        <p className="text-sm text-muted">{r.exportLocked}</p>
      )}

      {rows.length === 0 ? (
        <p className="text-muted">{r.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-line">
                {[r.name, r.attending, r.party, r.meal, r.message, r.when].map((h) => <th key={h} className="p-2">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id} className="border-b border-line align-top">
                  <td className="p-2 font-semibold">{x.name}</td>
                  <td className="p-2">{x.attending ? r.yes : r.no}</td>
                  <td className="p-2">{x.party_size}</td>
                  <td className="p-2">{x.attending ? dict.event.rsvp.meals[x.meal_preference as keyof typeof dict.event.rsvp.meals] : "–"}</td>
                  <td className="p-2">{x.message}</td>
                  <td className="p-2 whitespace-nowrap">{formatDateTime(x.created_at, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

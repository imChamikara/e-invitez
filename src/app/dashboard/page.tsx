import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { formatShortDate } from "@/lib/format";

export const metadata = { title: "My events" };

export default async function DashboardHome() {
  const { supabase } = await requireUser();
  const { lang, dict } = await getI18n();
  const l = dict.dash.list;
  const { data: events } = await supabase
    .from("events")
    .select("id, slug, title, occasion_type, event_date, is_published")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{l.title}</h1>
        <Link href="/dashboard/new" className="btn-accent">+ {l.create}</Link>
      </div>
      {!events?.length ? (
        <p className="card p-6 text-lg text-muted">{l.empty}</p>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => (
            <li key={e.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <h2 className="text-xl font-semibold">{e.title}</h2>
                <p className="text-muted">
                  {dict.common.occasions[e.occasion_type as keyof typeof dict.common.occasions] ?? e.occasion_type}
                  {e.event_date && ` · ${formatShortDate(e.event_date, lang)}`}
                </p>
                <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-sm font-semibold ${e.is_published ? "bg-green-100 text-green-900" : "bg-stone-200 text-stone-800"}`}>
                  {e.is_published ? l.published : l.draft}
                </span>
              </div>
              <div className="flex gap-2">
                <Link href={`/e/${e.slug}`} className="btn-outline">{l.view}</Link>
                <Link href={`/dashboard/${e.id}`} className="btn-accent">{l.manage}</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { notFound } from "next/navigation";
import { WishModerator } from "@/components/dashboard/WishModerator";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";

export default async function WishesPage({ params }: PageProps<"/dashboard/[id]/wishes">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { dict } = await getI18n();

  const { data: event } = await supabase.from("events").select("id").eq("id", id).maybeSingle();
  if (!event) notFound();
  const { data: wishes } = await supabase
    .from("wishes")
    .select("id, name, message, is_approved")
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{dict.dash.wishesAdmin.title}</h2>
      <WishModerator eventId={id} wishes={wishes ?? []} labels={dict.dash.wishesAdmin} />
    </div>
  );
}

import { EventEditor } from "@/components/dashboard/EventEditor";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "New event" };

export default async function NewEventPage() {
  const { user, plan } = await requireUser();
  const { lang, dict } = await getI18n();
  return (
    <>
      <h1 className="mb-4 text-3xl font-bold">{dict.dash.nav.new}</h1>
      <EventEditor dict={dict} lang={lang} userId={user.id} plan={plan} />
    </>
  );
}

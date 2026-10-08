import Link from "next/link";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { dict } = await getI18n();
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold">{dict.common.notFound.title}</h1>
      <p className="text-lg text-muted">{dict.common.notFound.text}</p>
      <Link href="/" className="tap inline-flex items-center rounded-full bg-brand px-6 font-semibold text-white">
        {dict.common.notFound.home}
      </Link>
    </main>
  );
}

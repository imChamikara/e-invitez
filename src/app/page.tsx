import Link from "next/link";
import { siteConfig } from "@/config/site";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold">{siteConfig.name}</h1>
      <Link href="/demo" className="tap inline-flex items-center rounded-full bg-brand px-6 font-semibold text-white">
        Demo
      </Link>
    </main>
  );
}

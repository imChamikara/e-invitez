import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { DEMO_EVENTS } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

export const dynamic = "force-dynamic"; // reads the database on each request

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.domain;
  const entries: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/demo`, changeFrequency: "monthly", priority: 0.7 },
    ...Object.keys(DEMO_EVENTS).map((k) => ({ url: `${base}/demo/${k}`, priority: 0.5 })),
  ];

  // Public events only: unlisted (is_private) and password-protected events are left out.
  if (hasSupabase()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("events")
        .select("slug, created_at")
        .eq("is_published", true)
        .eq("is_private", false)
        .eq("has_password", false)
        .limit(5000);
      for (const e of data ?? []) entries.push({ url: `${base}/e/${e.slug}`, lastModified: e.created_at, priority: 0.4 });
    } catch {
      // Sitemap must never fail the build because the database is unreachable.
    }
  }
  return entries;
}

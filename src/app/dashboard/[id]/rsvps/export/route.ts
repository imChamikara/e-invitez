import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { featuresFor } from "@/lib/plans";

/** Spreadsheet-safe CSV cell (also neutralises formula injection like =HYPERLINK()). */
function cell(value: unknown): string {
  let s = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(_req: NextRequest, ctx: RouteContext<"/dashboard/[id]/rsvps/export">) {
  const { id } = await ctx.params;
  const { supabase, plan } = await requireUser();
  if (!featuresFor(plan).csvExport) return new NextResponse("Not available on your plan", { status: 403 });

  const { data: event } = await supabase.from("events").select("slug").eq("id", id).maybeSingle();
  if (!event) return new NextResponse("Not found", { status: 404 });

  const { data } = await supabase.from("rsvps").select("name, attending, party_size, meal_preference, message, created_at").eq("event_id", id).order("created_at");
  const header = ["Name", "Attending", "Party size", "Meal", "Message", "Received (UTC)"];
  const lines = (data ?? []).map((r) =>
    [r.name, r.attending ? "yes" : "no", r.party_size, r.meal_preference, r.message, r.created_at].map(cell).join(","),
  );
  // BOM so Excel opens Sinhala/Tamil text correctly.
  const csv = `﻿${[header.map(cell).join(","), ...lines].join("\r\n")}`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}-rsvps.csv"`,
    },
  });
}

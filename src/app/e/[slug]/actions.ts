"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { isUnlocked, setUnlocked } from "@/lib/unlock";
import { rsvpSchema, wishSchema } from "@/lib/validation";

export interface FormState {
  status: "idle" | "ok" | "error";
  code?: "invalid" | "failed" | "closed";
  attending?: boolean;
}

/** Event lookup through RLS: only published events are visible to guests. */
async function findEvent(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id, has_password, rsvp_enabled, wishes_enabled")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return { supabase, event: data };
}

export async function submitRsvp(_prev: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("website")) return { status: "ok" }; // honeypot: bots fill hidden fields
  const parsed = rsvpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", code: "invalid" };
  if (!hasSupabase()) return { status: "error", code: "failed" };

  const input = parsed.data;
  const { supabase, event } = await findEvent(input.slug);
  if (!event) return { status: "error", code: "failed" };
  if (!event.rsvp_enabled) return { status: "error", code: "closed" };
  if (event.has_password && !(await isUnlocked(input.slug))) return { status: "error", code: "failed" };

  let guestId: string | null = null;
  if (input.guestToken) {
    const { data } = await supabase.rpc("get_guest_by_token", { p_slug: input.slug, p_token: input.guestToken });
    guestId = Array.isArray(data) && data[0] ? data[0].id : null;
  }

  const attending = input.attending === "yes";
  const { error } = await supabase.from("rsvps").insert({
    event_id: event.id,
    guest_id: guestId,
    name: input.name,
    attending,
    party_size: attending ? input.partySize : 0,
    meal_preference: input.meal,
    message: input.message,
  });
  if (error) return { status: "error", code: "failed" };
  return { status: "ok", attending };
}

export async function submitWish(_prev: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("website")) return { status: "ok" };
  const parsed = wishSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", code: "invalid" };
  if (!hasSupabase()) return { status: "error", code: "failed" };

  const { supabase, event } = await findEvent(parsed.data.slug);
  if (!event || !event.wishes_enabled) return { status: "error", code: "failed" };
  if (event.has_password && !(await isUnlocked(parsed.data.slug))) return { status: "error", code: "failed" };

  const { error } = await supabase
    .from("wishes")
    .insert({ event_id: event.id, name: parsed.data.name, message: parsed.data.message });
  if (error) return { status: "error", code: "failed" };
  revalidatePath(`/e/${parsed.data.slug}`);
  return { status: "ok" };
}

export async function unlockEvent(
  _prev: { wrong: boolean },
  formData: FormData,
): Promise<{ wrong: boolean }> {
  const slug = String(formData.get("slug") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!slug || !password || !hasSupabase()) return { wrong: true };

  const supabase = await createClient();
  const { data: ok } = await supabase.rpc("verify_event_password", { p_slug: slug, p_password: password });
  if (ok !== true) return { wrong: true };

  await setUnlocked(slug);
  const guest = String(formData.get("g") ?? "");
  redirect(`/e/${slug}${guest ? `?g=${encodeURIComponent(guest)}` : ""}`);
}

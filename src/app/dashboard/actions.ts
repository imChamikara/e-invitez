"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { siteConfig } from "@/config/site";
import { requireUser } from "@/lib/auth";
import { isValidSlug } from "@/lib/event-utils";
import { featuresFor } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { eventInputSchema, sectionInputSchema } from "@/lib/validation";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function checkSlug(slug: string, currentId?: string): Promise<boolean> {
  const { supabase } = await requireUser();
  if (!isValidSlug(slug) || (siteConfig.reservedSlugs as readonly string[]).includes(slug)) return false;
  if (currentId) {
    const { data } = await supabase.from("events").select("slug").eq("id", currentId).maybeSingle();
    if (data?.slug === slug) return true;
  }
  const { data } = await supabase.rpc("is_slug_available", { p_slug: slug });
  return data === true;
}

const saveSchema = z.object({
  event: eventInputSchema,
  sections: z.array(sectionInputSchema).max(40),
  photos: z.array(z.url()).max(80),
  coverImageUrl: z.url().nullable(),
  password: z.string().max(100).optional(),
  publish: z.boolean(),
});
export type SavePayload = z.input<typeof saveSchema>;

/** Creates (id = null) or updates an event together with its sections and photos. */
export async function saveEvent(id: string | null, payload: SavePayload): Promise<ActionResult<{ id: string; slug: string }>> {
  const { supabase, user, plan } = await requireUser();
  const parsed = saveSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { event: e, sections, photos, coverImageUrl, password, publish } = parsed.data;
  const features = featuresFor(plan);

  if ((siteConfig.reservedSlugs as readonly string[]).includes(e.slug)) return { ok: false, error: "slug_taken" };
  if (sections.length > features.maxSections) return { ok: false, error: "limit_sections" };
  if (photos.length > features.maxPhotos) return { ok: false, error: "limit_photos" };

  // Plan gating: premium look options silently fall back to defaults on the free plan.
  const theme = { ...e.theme };
  if (!features.customThemeColour) delete theme.accent;

  const row = {
    occasion_type: e.occasionType,
    title: e.title,
    slug: e.slug,
    template_key: e.templateKey,
    language_default: e.languageDefault,
    event_date: e.eventDate,
    venue_name: e.venueName,
    venue_address: e.venueAddress,
    maps_url: e.mapsUrl,
    story: e.story,
    cover_image_url: coverImageUrl,
    theme,
    translations: e.translations,
    rsvp_enabled: e.rsvpEnabled,
    wishes_enabled: e.wishesEnabled,
    is_private: e.isPrivate,
    is_published: publish,
  };

  let eventId = id;
  if (id) {
    const { error } = await supabase.from("events").update(row).eq("id", id);
    if (error) return { ok: false, error: error.code === "23505" ? "slug_taken" : "failed" };
  } else {
    const { data, error } = await supabase.from("events").insert({ ...row, owner_id: user.id }).select("id").single();
    if (error || !data) return { ok: false, error: error?.code === "23505" ? "slug_taken" : "failed" };
    eventId = data.id;
  }
  if (!eventId) return { ok: false, error: "failed" };

  // Replace children (small lists; keeps ordering simple).
  await supabase.from("event_sections").delete().eq("event_id", eventId);
  if (sections.length) {
    const { error } = await supabase.from("event_sections").insert(
      sections.map((s, i) => ({
        event_id: eventId,
        title: s.title,
        starts_at: s.startsAt,
        description: s.description,
        translations: s.translations,
        sort_order: i,
      })),
    );
    if (error) return { ok: false, error: "failed" };
  }
  await supabase.from("event_photos").delete().eq("event_id", eventId);
  if (photos.length) {
    const { error } = await supabase
      .from("event_photos")
      .insert(photos.map((url, i) => ({ event_id: eventId, url, sort_order: i })));
    if (error) return { ok: false, error: "failed" };
  }

  // Password: undefined = leave as is, "" = remove, otherwise set (bcrypt inside Postgres).
  if (password !== undefined && (password === "" || features.passwordProtection)) {
    await supabase.rpc("set_event_password", { p_event: eventId, p_password: password });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/e/${e.slug}`);
  return { ok: true, id: eventId, slug: e.slug };
}

export async function setPublished(id: string, published: boolean): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("events").update({ is_published: published }).eq("id", id);
  revalidatePath("/dashboard", "layout");
}

export async function deleteEvent(id: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("events").delete().eq("id", id);
  redirect("/dashboard");
}

/** Parses "Name, count, phone" lines (count and phone optional). */
export async function addGuests(eventId: string, text: string): Promise<ActionResult<{ added: number }>> {
  const { supabase, plan } = await requireUser();
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, count, phone] = line.split(/[,\t]/).map((p) => p.trim());
      const n = Number.parseInt(count ?? "", 10);
      return {
        event_id: eventId,
        name: (name ?? "").slice(0, 120),
        expected_count: Number.isFinite(n) ? Math.min(50, Math.max(1, n)) : 1,
        phone: phone ? phone.slice(0, 30) : null,
      };
    })
    .filter((r) => r.name);
  if (!rows.length) return { ok: false, error: "empty" };

  const { count } = await supabase.from("guests").select("id", { count: "exact", head: true }).eq("event_id", eventId);
  if ((count ?? 0) + rows.length > featuresFor(plan).maxGuests) return { ok: false, error: "limit_guests" };

  const { error } = await supabase.from("guests").insert(rows);
  if (error) return { ok: false, error: "failed" };
  revalidatePath(`/dashboard/${eventId}/guests`);
  return { ok: true, added: rows.length };
}

export async function deleteGuest(eventId: string, guestId: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("guests").delete().eq("id", guestId).eq("event_id", eventId);
  revalidatePath(`/dashboard/${eventId}/guests`);
}

export async function setWishApproved(eventId: string, wishId: string, approved: boolean): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("wishes").update({ is_approved: approved }).eq("id", wishId).eq("event_id", eventId);
  revalidatePath(`/dashboard/${eventId}/wishes`);
}

export async function deleteWish(eventId: string, wishId: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("wishes").delete().eq("id", wishId).eq("event_id", eventId);
  revalidatePath(`/dashboard/${eventId}/wishes`);
}

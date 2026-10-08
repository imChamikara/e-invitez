import { redirect } from "next/navigation";
import type { PlanKey } from "@/config/site";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

/** Returns the signed-in user + plan, or redirects to /login. */
export async function requireUser() {
  if (!hasSupabase()) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("plan, full_name").eq("id", user.id).maybeSingle();
  const plan: PlanKey = profile?.plan === "standard" || profile?.plan === "premium" ? profile.plan : "free";
  return { supabase, user, plan };
}

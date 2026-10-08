/** Accepts the new "publishable" key name or the legacy "anon" key name. */
function key(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

/** True when Supabase env vars are present. Without them the site runs in demo-only mode. */
export function hasSupabase(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && key());
}

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = key();
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured. See README.md → Setup.");
  }
  return { url, anonKey };
}

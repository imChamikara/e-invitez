import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabase, supabaseEnv } from "@/lib/supabase/env";

/**
 * Refreshes the Supabase auth session cookie. Runs only on owner routes so
 * public guest pages stay free of auth overhead.
 */
export async function proxy(request: NextRequest) {
  if (!hasSupabase()) return NextResponse.next();

  let response = NextResponse.next({ request });
  const { url, anonKey } = supabaseEnv();
  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/auth/:path*"],
};

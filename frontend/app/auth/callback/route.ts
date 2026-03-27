import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function safePath(raw: string | null): string {
  if (!raw) return "/dashboard";
  const allowed = ["/dashboard", "/stock/", "/portfolio", "/settings", "/profile", "/sign-in", "/sign-up", "/auth/reset-password"];
  try {
    const url = new URL(raw, "http://localhost");
    const path = url.pathname;
    if (allowed.some((prefix) => path === prefix || path.startsWith(prefix + "/"))) return path;
  } catch {}
  return "/dashboard";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safePath(searchParams.get("next"));

  const termsAccepted = searchParams.get("terms_accepted") === "1";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (termsAccepted) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && !user.user_metadata?.terms_accepted_at) {
          await supabase.auth.updateUser({
            data: { terms_accepted_at: new Date().toISOString() },
          });
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_failed`);
}

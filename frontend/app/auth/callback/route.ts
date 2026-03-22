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

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_failed`);
}

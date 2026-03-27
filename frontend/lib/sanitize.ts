const ALLOWED_HOSTS = [
  "supabase.co",
  "supabase.in",
  "googleapis.com",
  "googleusercontent.com",
  "github.com",
  "githubusercontent.com",
  "gravatar.com",
];

export function isSafeImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export function safeImageUrl(url: string | null | undefined): string | null {
  return isSafeImageUrl(url) ? url! : null;
}

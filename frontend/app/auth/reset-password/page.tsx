"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword]         = useState("");
  const [confirm,  setConfirm]          = useState("");
  const [loading,  setLoading]          = useState(false);
  const [error,    setError]            = useState("");
  const [done,     setDone]             = useState(false);
  const [ready,    setReady]            = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // Session already set by /auth/callback before redirect — check immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 6)  { setError("Password must be at least 6 characters."); return; }
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.email) {
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notify/password-changed`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ email: session.user.email }),
        }).catch(() => {});
      }
      setDone(true);
      setTimeout(() => router.replace("/dashboard"), 2500);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      <div className="w-full max-w-md">

        <Link href="/" className="flex items-center gap-2.5 justify-center mb-8 group">
          <div className="relative">
            <TrendingUp size={22} className="text-accent-green" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-green animate-ping opacity-75" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-green" />
          </div>
          <span className="font-mono text-sm font-medium tracking-[0.2em] text-text-primary group-hover:text-accent-green transition-colors">
            STOCKMIND
          </span>
        </Link>

        <div
          className="rounded-2xl p-8"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-bright)",
          }}
        >
          {done ? (
            <div className="text-center space-y-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
                style={{ backgroundColor: "rgba(0,230,118,0.12)" }}
              >
                <Lock size={22} style={{ color: "var(--accent-green)" }} />
              </div>
              <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                Password updated
              </h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Redirecting you to the dashboard…
              </p>
            </div>
          ) : !ready ? (
            <div className="text-center space-y-3">
              <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" style={{ color: "var(--accent-green)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Verifying reset link…</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Set new password
              </h1>
              <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                Choose a strong password for your account.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {(["password", "confirm"] as const).map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                      {field === "password" ? "New password" : "Confirm password"}
                    </label>
                    <input
                      type="password"
                      value={field === "password" ? password : confirm}
                      onChange={(e) => field === "password" ? setPassword(e.target.value) : setConfirm(e.target.value)}
                      required
                      autoFocus={field === "password"}
                      placeholder="••••••••"
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                      style={{
                        backgroundColor: "var(--bg-elevated)",
                        border: "1px solid var(--border-bright)",
                        color: "var(--text-primary)",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-green)")}
                      onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--border-bright)")}
                    />
                  </div>
                ))}

                {error && (
                  <p
                    className="text-xs px-3 py-2 rounded-lg"
                    style={{
                      color: "var(--accent-red)",
                      backgroundColor: "rgba(255,61,87,0.08)",
                      border: "1px solid rgba(255,61,87,0.2)",
                    }}
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !password || !confirm}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
                  style={{ backgroundColor: "var(--accent-green)", color: "#080C14" }}
                >
                  {loading
                    ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <Lock size={15} />
                  }
                  {loading ? "Saving…" : "Update password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TrendingUp, Eye, EyeOff, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const router       = useRouter();
  const searchParams = useSearchParams();
  const next         = searchParams.get("next") ?? "/dashboard";
  const supabase     = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Generic message — never reveal whether the email exists
      setError("Invalid email or password.");
      setLoading(false);
    } else {
      router.push(next);
      router.refresh();
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback?next=${next}` },
    });
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      <div className="w-full max-w-md">

        {/* Logo */}
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

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-bright)",
          }}
        >
          <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Welcome back
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Sign in to your StockMind account
          </p>

          {/* OAuth */}
          <div className="flex gap-3 mb-6">
            {(["google", "github"] as const).map((p) => (
              <button
                key={p}
                onClick={() => handleOAuth(p)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border-bright)",
                  color: "var(--text-secondary)",
                }}
              >
                {p === "google" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                )}
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  Password
                </label>
                <Link
                  href="/sign-in/forgot"
                  className="text-xs transition-colors"
                  style={{ color: "var(--accent-blue)" }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm outline-none transition-all"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border-bright)",
                    color: "var(--text-primary)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-green)")}
                  onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--border-bright)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

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
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
              style={{ backgroundColor: "var(--accent-green)", color: "#080C14" }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn size={15} />
              )}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--text-muted)" }}>
            No account?{" "}
            <Link href="/sign-up" style={{ color: "var(--accent-green)" }} className="font-medium">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

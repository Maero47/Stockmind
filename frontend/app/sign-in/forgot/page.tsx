"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, ArrowLeft, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [error,     setError]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/auth/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError("Something went wrong. Check the email address and try again.");
    } else {
      setSent(true);
    }
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

        <div
          className="rounded-2xl p-8"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-bright)",
          }}
        >
          {sent ? (
            /* ── Success state ── */
            <div className="text-center space-y-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
                style={{ backgroundColor: "rgba(0,230,118,0.12)" }}
              >
                <Mail size={22} style={{ color: "var(--accent-green)" }} />
              </div>
              <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                Check your inbox
              </h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                We sent a password reset link to <span style={{ color: "var(--text-secondary)" }}>{email}</span>.
                The link expires in 1 hour.
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Didn't get it? Check your spam folder or{" "}
                <button
                  onClick={() => setSent(false)}
                  className="underline underline-offset-2"
                  style={{ color: "var(--accent-blue)" }}
                >
                  try again
                </button>.
              </p>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-1.5 text-xs mb-6 transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                <ArrowLeft size={12} /> Back to sign in
              </Link>

              <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Reset your password
              </h1>
              <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                    placeholder="you@example.com"
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
                  disabled={loading || !email}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
                  style={{ backgroundColor: "var(--accent-green)", color: "#080C14" }}
                >
                  {loading
                    ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <Mail size={15} />
                  }
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

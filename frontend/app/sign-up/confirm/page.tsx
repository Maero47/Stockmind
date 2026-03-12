import Link from "next/link";
import { TrendingUp, Mail } from "lucide-react";

export default function ConfirmPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      <div className="w-full max-w-md text-center">

        <Link href="/" className="flex items-center gap-2.5 justify-center mb-8 group">
          <div className="relative">
            <TrendingUp size={22} className="text-accent-green" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-green animate-ping opacity-75" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-green" />
          </div>
          <span className="font-mono text-sm font-medium tracking-[0.2em] text-text-primary">
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
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              backgroundColor: "rgba(0,230,118,0.08)",
              border: "1px solid rgba(0,230,118,0.2)",
            }}
          >
            <Mail size={24} style={{ color: "var(--accent-green)" }} />
          </div>

          <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            Check your email
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            We&apos;ve sent you a confirmation link. Click it to activate your account and start analyzing stocks.
          </p>

          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Didn&apos;t receive it?{" "}
            <Link href="/sign-up" style={{ color: "var(--accent-green)" }}>
              Try again
            </Link>
            {" "}or check your spam folder.
          </p>
        </div>
      </div>
    </div>
  );
}

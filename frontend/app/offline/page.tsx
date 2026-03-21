"use client";

import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ backgroundColor: "rgba(255,61,87,0.1)", border: "1px solid rgba(255,61,87,0.2)" }}
      >
        <WifiOff size={28} style={{ color: "var(--accent-red)" }} />
      </div>
      <h1 className="text-xl font-semibold mb-2">You're offline</h1>
      <p className="text-sm max-w-sm" style={{ color: "var(--text-muted)" }}>
        Check your internet connection and try again. Previously viewed data may still be available.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
        style={{ backgroundColor: "var(--accent-green)", color: "#080C14" }}
      >
        Retry
      </button>
    </div>
  );
}

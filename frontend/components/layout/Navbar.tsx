"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, LogIn } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import { useProfile } from "@/hooks/useProfile";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const pathname  = usePathname();
  const router    = useRouter();
  const user      = useStore((s) => s.user);
  const clearKeys = useStore((s) => s.clearApiKeys);
  const clearChat = useStore((s) => s.clearChat);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    clearKeys();
    clearChat();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const { avatarUrl, initial, avatarColor } = useProfile();
  const avatarLetter = initial;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: scrolled
          ? "rgba(8, 12, 20, 0.92)"
          : "rgba(8, 12, 20, 0.6)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="StockMind" width={140} height={40} className="h-auto w-auto object-contain" priority />
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/dashboard"  active={pathname === "/dashboard"}>Dashboard</NavLink>
            <NavLink href="/portfolio"  active={pathname === "/portfolio"}>Portfolio</NavLink>
            <NavLink href="/settings"   active={pathname === "/settings"}>Settings</NavLink>
          </div>

          {user ? (
            /* Authenticated: avatar (links to profile) + sign-out */
            <div className="flex items-center gap-2 ml-3">
              <Link
                href="/profile"
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all overflow-hidden"
                style={{
                  backgroundColor: avatarUrl ? "transparent" : (pathname === "/profile" ? `${avatarColor}40` : `${avatarColor}25`),
                  border: `1px solid ${avatarColor}50`,
                  color: avatarColor,
                }}
                title="Profile"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  avatarLetter
                )}
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors"
                style={{ color: "var(--text-muted)" }}
                title="Sign out"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          ) : (
            /* Unauthenticated: sign in + get started */
            <>
              <Link
                href="/sign-in"
                className="ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors"
                style={{ color: "var(--text-secondary)" }}
              >
                <LogIn size={13} />
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200"
                style={{
                  color: "var(--accent-green)",
                  border: "1px solid rgba(0,230,118,0.4)",
                }}
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-sm transition-colors duration-200 ${
        active
          ? "text-text-primary bg-bg-subtle"
          : "text-text-secondary hover:text-text-primary hover:bg-bg-subtle/60"
      }`}
    >
      {children}
    </Link>
  );
}

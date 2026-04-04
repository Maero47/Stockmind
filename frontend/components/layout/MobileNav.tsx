"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Briefcase, ArrowLeftRight, User, Settings } from "lucide-react";

const tabs = [
  { href: "/dashboard",  icon: BarChart3,      label: "Dashboard" },
  { href: "/portfolio",  icon: Briefcase,      label: "Portfolio" },
  { href: "/converter",  icon: ArrowLeftRight, label: "Converter" },
  { href: "/profile",    icon: User,           label: "Profile" },
  { href: "/settings",   icon: Settings,       label: "Settings" },
] as const;

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        backgroundColor: `color-mix(in srgb, var(--bg-base) 95%, transparent)`,
        backdropFilter: "blur(16px)",
        borderTop: "1px solid var(--border)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[60px] transition-colors"
            >
              <Icon
                size={20}
                style={{ color: active ? "var(--accent-green)" : "var(--text-muted)" }}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: active ? "var(--accent-green)" : "var(--text-muted)" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

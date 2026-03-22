"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

export default function ThemeInitializer() {
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return null;
}

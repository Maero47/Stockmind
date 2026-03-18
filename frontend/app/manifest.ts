import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StockMind AI",
    short_name: "StockMind",
    description: "AI-powered stock and crypto analysis with real-time data",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#080C14",
    theme_color: "#080C14",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

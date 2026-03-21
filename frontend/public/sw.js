const STATIC_CACHE = "stockmind-static-v2";
const API_CACHE = "stockmind-api-v1";
const ALERT_STORE = "stockmind-alerts";

const PRECACHE = ["/", "/dashboard", "/offline"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE && k !== ALERT_STORE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  if (url.pathname.startsWith("/api/") || url.hostname.includes("supabase")) {
    e.respondWith(networkFirstWithCache(e.request));
  } else if (url.pathname.startsWith("/_next/static/") || url.pathname.match(/\.(js|css|png|jpg|svg|ico|woff2?)$/)) {
    e.respondWith(cacheFirst(e.request));
  } else {
    e.respondWith(networkFirstWithFallback(e.request));
  }
});

// handle notification requests from the client
self.addEventListener("message", (e) => {
  if (e.data?.type === "SHOW_NOTIFICATION") {
    self.registration.showNotification(e.data.title, {
      body: e.data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: `alert-${Date.now()}`,
      vibrate: [200, 100, 200],
      data: { url: "/dashboard" },
    });
  }

  if (e.data?.type === "STORE_ALERTS") {
    caches.open(ALERT_STORE).then((cache) => {
      const response = new Response(JSON.stringify(e.data.payload));
      cache.put("active-alerts", response);
    });
  }
});

// open app when notification is clicked
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || "/dashboard";
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

// background periodic sync — checks alerts when browser is closed
self.addEventListener("periodicsync", (e) => {
  if (e.tag === "check-alerts") {
    e.waitUntil(checkAlertsInBackground());
  }
});

async function checkAlertsInBackground() {
  try {
    const cache = await caches.open(ALERT_STORE);
    const cached = await cache.match("active-alerts");
    if (!cached) return;

    const alerts = await cached.json();
    if (!Array.isArray(alerts) || !alerts.length) return;

    const active = alerts.filter((a) => !a.triggered);
    if (!active.length) return;

    const symbols = [...new Set(active.map((a) => a.symbol))];
    const prices = {};

    await Promise.allSettled(
      symbols.map(async (sym) => {
        try {
          const res = await fetch(`${self.location.origin}/api/stocks/${encodeURIComponent(sym)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.price != null) prices[sym] = data.price;
          }
        } catch {}
      })
    );

    for (const alert of active) {
      const price = prices[alert.symbol];
      if (price == null) continue;

      const hit =
        (alert.direction === "above" && price >= alert.target_price) ||
        (alert.direction === "below" && price <= alert.target_price);

      if (!hit) continue;

      await self.registration.showNotification(`${alert.symbol} Price Alert`, {
        body: `${alert.symbol} ${alert.direction === "above" ? "rose above" : "fell below"} $${alert.target_price} — now $${price.toFixed(2)}`,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: `alert-bg-${alert.id}`,
        vibrate: [200, 100, 200],
        data: { url: `/stock/${alert.symbol}` },
      });

      // trigger via API
      try {
        await fetch(`${self.location.origin}/api/alerts/${alert.id}/trigger`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch {}
    }
  } catch {}
}

async function networkFirstWithCache(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      const headers = new Headers(clone.headers);
      headers.set("sw-cached-at", Date.now().toString());
      const body = await clone.blob();
      cache.put(request, new Response(body, { status: clone.status, statusText: clone.statusText, headers }));
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("", { status: 503 });
  }
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match("/offline") || new Response("Offline", { status: 503 });
  }
}

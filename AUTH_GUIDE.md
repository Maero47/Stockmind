# StockMind — Authentication & Security Guide (Supabase)

Full walkthrough for adding Supabase Auth to StockMind — covering the frontend, FastAPI backend JWT verification, encrypted API key storage, rate limiting, and production hardening.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Supabase Project Setup](#2-supabase-project-setup)
3. [Frontend — Install & Configure](#3-frontend--install--configure)
4. [Frontend — Auth Pages](#4-frontend--auth-pages)
5. [Frontend — Middleware (Route Protection)](#5-frontend--middleware-route-protection)
6. [Frontend — Session in the Store](#6-frontend--session-in-the-store)
7. [Frontend — Sign-out & Key Cleanup](#7-frontend--sign-out--key-cleanup)
8. [FastAPI — JWT Verification](#8-fastapi--jwt-verification)
9. [Storing AI Keys in Supabase (Optional)](#9-storing-ai-keys-in-supabase-optional)
10. [Rate Limiting Per User](#10-rate-limiting-per-user)
11. [Backend Groq Fallback (Free Tier)](#11-backend-groq-fallback-free-tier)
12. [HTTPS & CORS Hardening](#12-https--cors-hardening)
13. [Security Headers](#13-security-headers)
14. [CSRF Notes](#14-csrf-notes)
15. [Production Checklist](#15-production-checklist)

---

## 1. Overview

Supabase Auth issues standard **RS256 JWTs**. The flow is:

```
User (browser)
  → signs in via Supabase JS SDK (email/password, Google, GitHub, …)
  → receives access_token (JWT, 1hr) + refresh_token (long-lived)
  → sends access_token as  Authorization: Bearer <token>  to FastAPI
  → FastAPI fetches Supabase JWKS once, caches it, and verifies every request
```

Your SQLite database can stay as-is for ML/stock data. User accounts and (optionally) encrypted AI keys live in Supabase Postgres. The two databases are separate — they never conflict.

---

## 2. Supabase Project Setup

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Note your credentials from **Project Settings → API**:
   - `Project URL`  (e.g. `https://abcxyz.supabase.co`)
   - `anon / public` key  — safe to expose in the browser
   - `service_role` key  — **never expose client-side**, use only in FastAPI
   - `JWT Secret`  — under **Settings → JWT** — needed for FastAPI token verification

3. Enable email auth under **Authentication → Providers → Email** (on by default)
4. Optionally enable **Google / GitHub** OAuth providers under the same screen

### Optional: user_api_keys table

Run this in the Supabase **SQL Editor** to store encrypted AI keys server-side:

```sql
create table public.user_api_keys (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  provider    text not null,              -- 'openai' | 'anthropic' | 'groq' | 'gemini'
  key_enc     text not null,              -- Fernet-encrypted ciphertext
  created_at  timestamptz default now(),
  last_used   timestamptz,
  unique(user_id, provider)
);

-- Only the owner can read/write their own keys
alter table public.user_api_keys enable row level security;

create policy "owner can manage own keys"
  on public.user_api_keys
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## 3. Frontend — Install & Configure

```bash
cd stockmind/frontend
npm install @supabase/supabase-js @supabase/ssr
```

### Environment variables

```env
# frontend/.env.local  — never commit this file
NEXT_PUBLIC_SUPABASE_URL=https://abcxyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Supabase client helpers

```ts
// lib/supabase/client.ts  — browser client (use in Client Components)
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```ts
// lib/supabase/server.ts  — server client (use in Server Components / Route Handlers)
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
```

---

## 4. Frontend — Auth Pages

### Sign-up page

```tsx
// app/sign-up/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
    } else {
      // Show "check your email" message
      router.push("/sign-up/confirm");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email" value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email" required
      />
      <input
        type="password" value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password (12+ chars)" required minLength={12}
      />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit">Create account</button>
    </form>
  );
}
```

### Sign-in page

```tsx
// app/sign-in/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Never reveal whether email exists — use a generic message
      setError("Invalid email or password.");
    } else {
      router.push("/dashboard");
      router.refresh(); // re-run Server Components with new session
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit">Sign in</button>
    </form>
  );
}
```

### OAuth (Google / GitHub) — one button

```tsx
const supabase = createClient();

await supabase.auth.signInWithOAuth({
  provider: "google",   // or "github"
  options:  { redirectTo: `${location.origin}/auth/callback` },
});
```

### Auth callback route (handles email confirmation + OAuth redirect)

```ts
// app/auth/callback/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const next  = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_failed`);
}
```

---

## 5. Frontend — Middleware (Route Protection)

```ts
// middleware.ts  (project root, next to package.json)
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up", "/auth/callback"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — IMPORTANT: always do this before checking user
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
```

---

## 6. Frontend — Session in the Store

Expose the Supabase user and access token through the Zustand store so any component can read it.

```ts
// Add to lib/store.ts

import { createClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

// Add to StockMindState interface:
//   user:       User | null;
//   session:    Session | null;
//   setSession: (session: Session | null) => void;

// Add to create() implementation:
//   user:       null,
//   session:    null,
//   setSession: (session) => set({ session, user: session?.user ?? null }),
```

In your root layout, listen for auth state changes and sync to the store:

```tsx
// components/AuthListener.tsx
"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";

export default function AuthListener() {
  const setSession = useStore((s) => s.setSession);
  const supabase   = createClient();

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Subscribe to future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
```

Add `<AuthListener />` inside `app/layout.tsx` body.

---

## 7. Frontend — Sign-out & Key Cleanup

Always clear AI keys from sessionStorage on sign-out. Leaving them risks the next user on a shared computer accessing them.

```ts
// In a sign-out button component
const supabase   = createClient();
const clearKeys  = useStore((s) => s.clearApiKeys);   // add this action to store
const clearChat  = useStore((s) => s.clearChat);

async function handleSignOut() {
  clearKeys();    // wipe keys from sessionStorage
  clearChat();    // clear chat history
  await supabase.auth.signOut();
  router.push("/");
}
```

```ts
// In store.ts — add clearApiKeys action:
clearApiKeys: () => {
  sessionStorage.removeItem("sm_api_keys");
  set({ apiKeys: { openai: "", anthropic: "", groq: "", gemini: "" } });
},
```

---

## 8. FastAPI — JWT Verification

Supabase JWTs are signed with **HS256** using your project's JWT secret. FastAPI verifies them without any network call.

### Install

```bash
pip install python-jose[cryptography]
```

### Auth dependency

```python
# backend/api/dependencies/auth.py
import os
from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError

SUPABASE_JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"]  # from Supabase → Settings → JWT
JWT_ALGORITHM       = "HS256"

async def get_current_user(authorization: str = Header(default="")):
    """
    Verifies the Supabase JWT from the Authorization header.
    Returns the decoded payload including sub (user_id) and email.
    Raises 401 if missing or invalid.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.removeprefix("Bearer ")

    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            audience="authenticated",   # Supabase sets this claim
        )
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no subject")
        return {
            "user_id": user_id,
            "email":   payload.get("email"),
            "role":    payload.get("role", "authenticated"),
        }
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {e}")


async def get_optional_user(authorization: str = Header(default="")):
    """
    Like get_current_user but returns None instead of raising.
    Use on endpoints that allow unauthenticated access with reduced limits.
    """
    if not authorization.startswith("Bearer "):
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None
```

### Backend `.env`

```env
# backend/.env
SUPABASE_JWT_SECRET=your-supabase-jwt-secret-here
```

### Apply to routes

```python
# api/routes/ai.py
from api.dependencies.auth import get_current_user, get_optional_user

# Fully protected — 401 if no valid token
@router.post("/api/ai/analyze")
async def analyze(
    request: Request,
    body:    AnalyzeRequest,
    user:    dict = Depends(get_current_user),
):
    user_id = user["user_id"]
    # ... use user_id for per-user rate limiting
```

### Passing the token from the frontend

When making API calls, retrieve the session token and include it:

```ts
// lib/api.ts — updated apiFetch helper
import { createClient } from "@/lib/supabase/client";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body?.detail ?? `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}
```

---

## 9. Storing AI Keys in Supabase (Optional)

This replaces sessionStorage with encrypted server-side storage so users only enter their keys once, across devices.

### Encryption helper (backend)

```python
# backend/services/security/encryption.py
import os
from cryptography.fernet import Fernet

# Generate once and store in env: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
_fernet = Fernet(os.environ["ENCRYPTION_KEY"].encode())

def encrypt(plaintext: str) -> str:
    return _fernet.encrypt(plaintext.encode()).decode()

def decrypt(ciphertext: str) -> str:
    return _fernet.decrypt(ciphertext.encode()).decode()
```

### API routes for key management

```python
# backend/api/routes/keys.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, constr
from supabase import create_client, Client
from api.dependencies.auth import get_current_user
from services.security.encryption import encrypt, decrypt
import os

router = APIRouter()

supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],  # service role to bypass RLS on this server
)

VALID_PROVIDERS = {"openai", "anthropic", "groq", "gemini"}

class SaveKeyRequest(BaseModel):
    provider: str
    api_key:  constr(min_length=10, max_length=200)

@router.post("/api/keys")
async def save_key(body: SaveKeyRequest, user: dict = Depends(get_current_user)):
    if body.provider not in VALID_PROVIDERS:
        raise HTTPException(400, "Unknown provider")

    supabase.table("user_api_keys").upsert({
        "user_id":  user["user_id"],
        "provider": body.provider,
        "key_enc":  encrypt(body.api_key),
    }, on_conflict="user_id,provider").execute()

    return {"ok": True}


@router.get("/api/keys/{provider}")
async def get_key(provider: str, user: dict = Depends(get_current_user)):
    if provider not in VALID_PROVIDERS:
        raise HTTPException(400, "Unknown provider")

    result = (
        supabase.table("user_api_keys")
        .select("key_enc")
        .eq("user_id", user["user_id"])
        .eq("provider", provider)
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise HTTPException(404, "No key saved for this provider")

    # Decrypt and return — never store plaintext, decrypt only at moment of use
    return { "api_key": decrypt(result.data["key_enc"]) }


@router.delete("/api/keys/{provider}")
async def delete_key(provider: str, user: dict = Depends(get_current_user)):
    supabase.table("user_api_keys").delete().eq("user_id", user["user_id"]).eq("provider", provider).execute()
    return {"ok": True}
```

Add to `backend/.env`:

```env
SUPABASE_URL=https://abcxyz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # keep strictly server-side
ENCRYPTION_KEY=<generated Fernet key>
```

Install the Supabase Python client:

```bash
pip install supabase
```

---

## 10. Rate Limiting Per User

Replace the current IP-based limiter with user-ID-based limits.

```python
# backend/api/middleware/rate_limit.py
from collections import defaultdict
from fastapi import Request, HTTPException
import time

FREE_LIMIT  = 20    # AI requests per hour (authenticated users without own key)
ANON_LIMIT  = 5     # AI requests per hour (unauthenticated)

_user_windows: dict[str, list[float]] = defaultdict(list)

def check_rate_limit(key: str, limit: int, window: int = 3600) -> int:
    """
    Returns remaining requests. Raises 429 if over limit.
    key = user_id for authenticated, IP for anonymous.
    """
    now  = time.time()
    hits = _user_windows[key]
    _user_windows[key] = [t for t in hits if now - t < window]

    remaining = limit - len(_user_windows[key])
    if remaining <= 0:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit reached. Try again in {window // 60} minutes.",
            headers={"Retry-After": str(window)},
        )

    _user_windows[key].append(now)
    return remaining - 1
```

Usage in the AI route:

```python
from api.dependencies.auth import get_optional_user
from api.middleware.rate_limit import check_rate_limit

@router.post("/api/ai/analyze")
async def analyze(request: Request, body: AnalyzeRequest, user=Depends(get_optional_user)):
    rate_key = user["user_id"] if user else request.client.host
    limit    = FREE_LIMIT if user else ANON_LIMIT
    check_rate_limit(rate_key, limit)
    # ...
```

For production with multiple workers, swap the in-memory dict for **Redis**:

```bash
pip install redis
```

```python
import redis.asyncio as aioredis

redis = aioredis.from_url(os.environ["REDIS_URL"])

async def check_rate_limit_redis(key: str, limit: int, window: int = 3600) -> int:
    pipe  = redis.pipeline()
    now   = time.time()
    wkey  = f"rl:{key}"
    await pipe.zremrangebyscore(wkey, 0, now - window)
    await pipe.zadd(wkey, {str(now): now})
    await pipe.zcard(wkey)
    await pipe.expire(wkey, window)
    results = await pipe.execute()
    count   = results[2]
    if count > limit:
        raise HTTPException(429, "Rate limit exceeded", headers={"Retry-After": str(window)})
    return limit - count
```

---

## 11. Backend Groq Fallback (Free Tier)

Lets users without their own AI key still try the app, using your Groq key.

```env
# backend/.env
GROQ_API_KEY=gsk_...
GROQ_FALLBACK_ENABLED=true
GROQ_FALLBACK_DAILY_LIMIT=10    # per user/IP per day
```

```python
# In api/routes/ai.py
FALLBACK_LIMIT   = int(os.getenv("GROQ_FALLBACK_DAILY_LIMIT", "10"))
_fallback_counts: dict[str, list[float]] = defaultdict(list)

@router.post("/api/ai/analyze")
async def analyze(request: Request, body: AnalyzeRequest, user=Depends(get_optional_user)):
    provider = request.headers.get("X-AI-Provider", "groq")
    api_key  = request.headers.get("X-AI-Key", "").strip()

    if not api_key:
        if os.getenv("GROQ_FALLBACK_ENABLED") != "true":
            raise HTTPException(400, "No API key provided. Add one in Settings.")

        # Prefer user_id over IP for authenticated users
        rate_key = user["user_id"] if user else request.client.host
        now      = time.time()
        window   = 86400
        hits     = _fallback_counts[rate_key]
        _fallback_counts[rate_key] = [t for t in hits if now - t < window]

        if len(_fallback_counts[rate_key]) >= FALLBACK_LIMIT:
            raise HTTPException(
                429,
                f"Free AI limit reached ({FALLBACK_LIMIT}/day). "
                "Add your own API key in Settings for unlimited use.",
            )

        _fallback_counts[rate_key].append(now)
        api_key  = os.environ["GROQ_API_KEY"]
        provider = "groq"

    remaining = FALLBACK_LIMIT - len(_fallback_counts.get(
        user["user_id"] if user else request.client.host, []
    ))

    # ... stream response with extra header
    async def event_stream():
        async for chunk in stream_analysis(body.symbol, body.question, provider, api_key):
            yield chunk

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"X-Fallback-Remaining": str(max(remaining, 0))},
    )
```

---

## 12. HTTPS & CORS Hardening

### HTTPS

All major platforms (Vercel, Railway, Render, Fly.io) enforce HTTPS automatically. If self-hosting:

```nginx
server {
    listen 80;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
}
```

### Tighten CORS

Change `allow_origins=["*"]` before going public:

```python
# main.py
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,   # "https://stockmind.yourdomain.com"
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-AI-Provider", "X-AI-Key"],
)
```

---

## 13. Security Headers

```ts
// next.config.ts
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control",    value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options",           value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co https://api.openai.com https://api.anthropic.com https://api.groq.com https://generativelanguage.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
    ].join("; "),
  },
];

const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
```

FastAPI security headers middleware:

```python
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"]        = "DENY"
    response.headers["Referrer-Policy"]        = "strict-origin-when-cross-origin"
    return response
```

---

## 14. CSRF Notes

Supabase Auth uses **JWTs in Authorization headers**, not cookies, for API calls. CSRF does not apply to this pattern — it only affects cookie-based sessions. The Supabase session cookies used by the SSR package are `HttpOnly; SameSite=Lax` which already blocks cross-origin form submissions.

No additional CSRF tokens are needed.

---

## 15. Production Checklist

### Secrets
- [ ] `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `GROQ_API_KEY` all in env vars
- [ ] `.env`, `.env.local` listed in `.gitignore`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is **never** in any `NEXT_PUBLIC_` variable
- [ ] Rotate all secrets if accidentally committed

### Supabase configuration
- [ ] Row Level Security enabled on `user_api_keys` table (done in setup SQL above)
- [ ] Email confirmations enabled (on by default)
- [ ] Set a minimum password length in **Authentication → Settings** (recommend 12)
- [ ] Consider enabling **MFA (TOTP)** for users — available free in Supabase

### Input validation
- [ ] Stock symbol validated server-side: `constr(pattern=r"^[A-Z]{1,10}$")`
- [ ] AI question limited server-side: `constr(max_length=2000)`
- [ ] API key inputs validated: `constr(min_length=10, max_length=200)`

### Database
- [ ] Supabase Postgres handles user data; SQLite handles stock/ML data
- [ ] ORM / parameterized queries everywhere in FastAPI (no string interpolation in SQL)
- [ ] SQLite file backed up regularly if using for production ML logs

### Logging
- [ ] Never log `Authorization` headers or decrypted API keys
- [ ] Log auth failures with timestamp and IP (not the attempted token)
- [ ] Sentry for error alerting: `pip install sentry-sdk` / `npx @sentry/wizard -i nextjs`

### Dependencies
- [ ] `pip audit` and `npm audit` before launch
- [ ] Pin versions with `==` in `requirements.txt`

### Key exposure
- [ ] `X-AI-Key` header is never logged in FastAPI
- [ ] `clearApiKeys()` is called on sign-out
- [ ] sessionStorage keys are cleared when the browser tab closes (sessionStorage is tab-scoped by default)

---

## Quick Start (30-minute path)

```bash
# 1. Create Supabase project at supabase.com, copy credentials

# 2. Install frontend packages
cd stockmind/frontend
npm install @supabase/supabase-js @supabase/ssr

# 3. Add to frontend/.env.local
#    NEXT_PUBLIC_SUPABASE_URL=...
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# 4. Install backend package
cd ../backend
pip install python-jose[cryptography] supabase cryptography

# 5. Add to backend/.env
#    SUPABASE_JWT_SECRET=...
#    SUPABASE_URL=...
#    SUPABASE_SERVICE_ROLE_KEY=...
#    ENCRYPTION_KEY=<python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">
#    GROQ_API_KEY=...

# 6. Create lib/supabase/client.ts and server.ts
# 7. Add middleware.ts for route protection
# 8. Add app/sign-in/page.tsx and app/sign-up/page.tsx
# 9. Add app/auth/callback/route.ts
# 10. Add api/dependencies/auth.py to FastAPI
# 11. Tighten CORS in main.py
# 12. Add security headers to next.config.ts
```

With this in place you get: email/password auth, optional Google/GitHub OAuth, email confirmation, JWT-protected FastAPI endpoints, encrypted AI key storage, per-user rate limiting, and a Groq fallback for free-tier users.

"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import { listSavedKeys } from "@/lib/api";
import type { AIProvider } from "@/lib/types";

/**
 * Mounts once in the root layout.
 * Syncs the Supabase session → Zustand store whenever auth state changes.
 * On sign-in, also fetches saved providers from the backend.
 */
export default function AuthListener() {
  const setSession        = useStore((s) => s.setSession);
  const setSavedProviders = useStore((s) => s.setSavedProviders);
  const setActiveProvider = useStore((s) => s.setActiveProvider);
  const supabase          = createClient();

  useEffect(() => {
    // Hydrate on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadSavedProviders();
    });

    // Subscribe to future changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) {
          loadSavedProviders();
        } else {
          // Signed out — clear saved providers
          setSavedProviders([]);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function loadSavedProviders() {
    listSavedKeys()
      .then((rows) => {
        const providers = rows.map((r) => r.provider as AIProvider);
        setSavedProviders(providers);
        // Auto-switch active provider to a saved one
        if (providers.length > 0) {
          const { apiKeys, activeProvider } = useStore.getState();
          if (activeProvider !== "free" && !apiKeys[activeProvider]) {
            setActiveProvider(providers[0]);
          }
        }
      })
      .catch(() => {});
  }

  return null;
}

"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase-client";

type SupabaseUserState = {
  isLoaded: boolean;
  user: User | null;
};

export function useSupabaseUser(): SupabaseUserState {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [state, setState] = useState<SupabaseUserState>({ isLoaded: false, user: null });

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setState({ isLoaded: true, user: data.user });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ isLoaded: true, user: session?.user ?? null });
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  return state;
}

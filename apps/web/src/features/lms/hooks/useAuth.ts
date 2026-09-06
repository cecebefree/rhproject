import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";

/**
 * T017 — useAuth hook
 * Returns the current authenticated user and loading state.
 * Subscribes to auth state changes for real-time updates.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}

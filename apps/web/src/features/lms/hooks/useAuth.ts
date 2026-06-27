import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { Profile, UserRole } from '../types/lms';

interface AuthState {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  loading: boolean;
  error: Error | null;
}

interface UseAuthReturn extends AuthState {
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  isAuthenticated: boolean;
  role: UserRole | null;
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data as Profile;
  }, []);

  const loadUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setState({ user: null, profile: null, loading: false, error: null });
      return;
    }

    try {
      const profile = await fetchProfile(user.id);
      setState({ user, profile, loading: false, error: null });
    } catch (err) {
      setState({ user, profile: null, loading: false, error: err as Error });
    }
  }, [fetchProfile]);

  useEffect(() => {
    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const profile = await fetchProfile(session.user.id);
          setState({ user: session.user, profile, loading: false, error: null });
        } catch (err) {
          setState({ user: session.user, profile: null, loading: false, error: err as Error });
        }
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, profile: null, loading: false, error: null });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, loadUser]);

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) return { error };

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          name,
          role: 'student',
        });

      if (profileError) return { error: profileError };
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    ...state,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!state.user,
    role: state.profile?.role ?? null,
  };
}
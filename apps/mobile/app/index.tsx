import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { LoadingState } from '../src/components/LoadingState';
import { supabase } from '../src/services/supabase';

export default function Index() {
  const [session, setSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === null) return <LoadingState />;

  return session ? <Redirect href="/(tabs)" /> : <Redirect href="/login" />;
}

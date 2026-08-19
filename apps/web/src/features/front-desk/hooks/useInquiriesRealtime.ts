import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import type { Inquiry } from '../../../types/front-desk';

interface UseInquiriesRealtimeOptions {
  enabled?: boolean;
}

export function useInquiriesRealtime(options: UseInquiriesRealtimeOptions = {}) {
  const { enabled = true } = options;
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const fetchInquiries = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .schema('front_desk')
          .from('inquiries')
          .select('*')
          .order('created_at', { ascending: false });

        if (err) throw err;
        setInquiries((data as Inquiry[]) || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch inquiries');
      } finally {
        setLoading(false);
      }
    };

    fetchInquiries();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('inquiries-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'front_desk', table: 'inquiries' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setInquiries((prev) => [payload.new as Inquiry, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setInquiries((prev) =>
              prev.map((inq) => (inq.id === (payload.new as Inquiry).id ? (payload.new as Inquiry) : inq))
            );
          } else if (payload.eventType === 'DELETE') {
            setInquiries((prev) => prev.filter((inq) => inq.id !== (payload.old as Inquiry).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);

  return { inquiries, loading, error };
}

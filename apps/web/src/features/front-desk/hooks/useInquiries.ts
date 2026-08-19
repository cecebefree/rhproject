import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import type { Inquiry } from '../../../types/front-desk';

export interface InquiriesFilters {
  status?: string;
  ai_category?: 'hot' | 'warm' | 'nurture' | 'blocked';
  assigned_counselor_id?: string;
  timezone?: string;
  language?: string;
  sort_by?: 'ai_score' | 'created_at';
}

interface UseInquiriesResult {
  inquiries: Inquiry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useInquiries(filters?: InquiriesFilters): UseInquiriesResult {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    setError(null);

    const f = filtersRef.current;

    let query = supabase
      .schema('front_desk')
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (f?.status) {
      query = query.eq('enrollment_status', f.status);
    }
    if (f?.ai_category) {
      query = query.eq('ai_category', f.ai_category);
    }
    if (f?.assigned_counselor_id) {
      query = query.eq('assigned_counselor_id', f.assigned_counselor_id);
    }
    if (f?.timezone) {
      query = query.eq('timezone', f.timezone);
    }
    if (f?.language) {
      query = query.eq('language', f.language);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    let sorted = data || [];
    if (f?.sort_by === 'ai_score') {
      const order = { hot_lead: 0, warm: 1, nurture: 2, blocked: 3 };
      sorted = [...sorted].sort(
        (a, b) =>
          (order[a.ai_category as keyof typeof order] ?? 4) -
          (order[b.ai_category as keyof typeof order] ?? 4)
      );
    }

    setInquiries(sorted);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries, filters?.status, filters?.ai_category, filters?.assigned_counselor_id, filters?.timezone, filters?.language, filters?.sort_by]);

  useEffect(() => {
    const channel = supabase
      .channel('inquiries-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'front_desk',
          table: 'inquiries',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setInquiries((prev) => [payload.new as Inquiry, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setInquiries((prev) =>
              prev.map((inq) =>
                inq.id === (payload.new as Inquiry).id
                  ? (payload.new as Inquiry)
                  : inq
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setInquiries((prev) =>
              prev.filter((inq) => inq.id !== (payload.old as Inquiry).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { inquiries, loading, error, refresh: fetchInquiries };
}

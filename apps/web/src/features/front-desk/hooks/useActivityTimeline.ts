import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { TimelineEvent } from '../../../types/front-desk';

interface UseActivityTimelineResult {
  timeline: TimelineEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useActivityTimeline(inquiryId: string | null): UseActivityTimelineResult {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!inquiryId) {
      setTimeline([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc('get_activity_timeline', {
      p_inquiry_id: inquiryId,
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    setTimeline((data as TimelineEvent[]) || []);
    setLoading(false);
  }, [inquiryId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  return { timeline, loading, error, refresh: fetchTimeline };
}

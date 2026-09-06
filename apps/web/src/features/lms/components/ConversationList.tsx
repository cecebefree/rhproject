// ConversationList — list of conversations with last message preview

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

interface Conversation {
  id: string;
  category: string;
  created_at: string;
  last_message?: string;
  last_message_at?: string;
  member_count?: number;
}

interface ConversationListProps {
  onSelect: (conversationId: string) => void;
  selectedId?: string;
}

export function ConversationList({ onSelect, selectedId }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    setLoading(true);

    const { data: convs } = await supabase
      .from('conversations' as any)
      .select('id, category, created_at')
      .order('created_at', { ascending: false });

    if (!convs) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const enriched = await Promise.all(
      (convs as any[]).map(async (c) => {
        const { data: lastMsg } = await supabase
          .from('messages' as any)
          .select('body, created_at')
          .eq('conversation_id', c.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const { count } = await supabase
          .from('conversation_members' as any)
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', c.id);

        return {
          ...c,
          last_message: (lastMsg as any)?.body ?? 'No messages yet',
          last_message_at: (lastMsg as any)?.created_at ?? c.created_at,
          member_count: count ?? 0,
        };
      })
    );

    enriched.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
    setConversations(enriched);
    setLoading(false);
  }

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading conversations...</div>;
  }

  return (
    <div className="border-r" style={{ width: '320px', borderColor: 'rgba(195,199,204,0.3)' }}>
      <div className="p-3 border-b flex justify-between items-center" style={{ borderColor: 'rgba(195,199,204,0.3)' }}>
        <span className="text-sm font-semibold" style={{ color: '#273946' }}>Chats</span>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f0f0f0', color: '#54626C' }}>
          {conversations.length}
        </span>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {conversations.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 text-center">No conversations yet</div>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`w-full text-left px-3 py-3 border-b transition-colors ${
                selectedId === c.id ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
              style={{ borderColor: 'rgba(195,199,204,0.2)' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0"
                  style={{ backgroundColor: '#273946' }}>
                  {c.category?.charAt(0)?.toUpperCase() ?? 'C'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className="text-sm font-medium truncate" style={{ color: '#1A242B' }}>
                      {c.category || 'General'}
                    </p>
                    <span className="text-xs shrink-0 ml-2" style={{ color: '#9ca3af' }}>
                      {formatRelativeTime(c.last_message_at ?? c.created_at)}
                    </span>
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: '#54626C' }}>
                    {c.last_message}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                    {c.member_count} member{c.member_count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString();
}

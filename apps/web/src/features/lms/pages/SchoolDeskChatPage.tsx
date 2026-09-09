// SchoolDeskChatPage — Direct chat section for School Front Desk

import { useEffect, useState } from 'react';
import { ChatView } from '../components/ChatView';
import { ConversationList } from '../components/ConversationList';
import { supabaseUntyped as supabase } from '../services/supabase';

export default function SchoolDeskChatPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [profiles, setProfiles] = useState<{ id: string; name: string }[]>([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  async function loadProfiles() {
    const { data } = await supabase
      .from('profiles')
      .select('id, name')
      .not('name', 'is', null)
      .limit(50);
    setProfiles((data ?? []) as Array<{ id: string; name: string }>);
  }

  async function handleCreateConversation() {
    if (!selectedMember || !userId) return;

    setCreating(true);

    // Check if conversation already exists between these two users
    const { data: existingMembers } = await supabase
      .from('conversation_members' as never)
      .select('conversation_id')
      .eq('profile_id', userId);

    if (existingMembers) {
      for (const m of existingMembers as Array<Record<string, unknown>>) {
        const { data: otherMember } = await supabase
          .from('conversation_members' as never)
          .select('profile_id')
          .eq('conversation_id', m.conversation_id)
          .eq('profile_id', selectedMember)
          .single();

        if (otherMember) {
          setSelectedConversation(m.conversation_id as string);
          setCreating(false);
          setShowNewChat(false);
          return;
        }
      }
    }

    // Create new conversation
    const { data: conv } = await supabase
      .from('conversations' as never)
      .insert({
        category: 'direct',
        created_by: userId,
        tenant_id: import.meta.env.VITE_DEFAULT_TENANT_ID,
      })
      .select('id')
      .single();

    if (conv) {
      const convId = conv.id as string;
      await supabase.from('conversation_members' as never).insert([
        { conversation_id: convId, profile_id: userId, role: 'member' },
        { conversation_id: convId, profile_id: selectedMember, role: 'member' },
      ]);

      setSelectedConversation(convId);
    }

    setCreating(false);
    setShowNewChat(false);
  }

  return (
    <div style={{ padding: '24px' }}>
      <div className="flex justify-between items-center mb-4">
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#273946' }}>Messages</h3>
        <button type="button"
          onClick={() => {
            setShowNewChat(!showNewChat);
            if (!showNewChat) loadProfiles();
          }}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: '#2563EB' }}
        >
          {showNewChat ? 'Cancel' : '+ New Chat'}
        </button>
      </div>

      {showNewChat && (
        <div
          className="mb-4 p-4 bg-white rounded-lg border"
          style={{ borderColor: 'rgba(195,199,204,0.3)' }}
        >
          <p className="text-sm font-medium mb-2" style={{ color: '#1A242B' }}>
            Start a conversation with:
          </p>
          <div className="flex gap-2">
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border rounded"
              style={{ borderColor: 'rgba(195,199,204,0.3)' }}
            >
              <option value="">Select a person...</option>
              {profiles
                .filter((p) => p.id !== userId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <button type="button"
              onClick={handleCreateConversation}
              disabled={!selectedMember || creating}
              className="px-4 py-2 text-sm font-medium text-white rounded disabled:opacity-50"
              style={{ backgroundColor: '#273946' }}
            >
              {creating ? 'Creating...' : 'Start'}
            </button>
          </div>
        </div>
      )}

      <div
        className="flex bg-white rounded-lg border overflow-hidden"
        style={{ borderColor: 'rgba(195,199,204,0.3)', height: 'calc(100vh - 250px)' }}
      >
        <ConversationList
          onSelect={setSelectedConversation}
          selectedId={selectedConversation ?? undefined}
        />

        {selectedConversation ? (
          <ChatView conversationId={selectedConversation} currentUserId={userId} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}

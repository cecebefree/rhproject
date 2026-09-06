// ChatView — message thread for a single conversation

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  profiles?: { name: string } | null;
}

interface ChatViewProps {
  conversationId: string;
  currentUserId: string;
}

export function ChatView({ conversationId, currentUserId }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    setLoading(true);

    const { data } = await supabase
      .from('messages' as any)
      .select('id, sender_id, body, created_at')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (data) {
      const enriched = await Promise.all(
        (data as any[]).map(async (m) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', m.sender_id)
            .single();
          return { ...m, profiles: profile };
        })
      );
      setMessages(enriched);
    }

    setLoading(false);
  }

  async function handleSend() {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const body = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase.from('messages' as any).insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      body,
      event: 'message',
    });

    if (!error) {
      // Optimistic add
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender_id: currentUserId,
          body,
          created_at: new Date().toISOString(),
          profiles: null,
        },
      ]);
    }

    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-sm text-gray-500">Loading messages...</div>;
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3" style={{ backgroundColor: '#faf9f6' }}>
        {messages.length === 0 ? (
          <div className="text-center text-sm text-gray-500 mt-8">
            No messages yet. Start the conversation.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className={`flex mb-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                  isMe ? 'text-white' : 'bg-white border'
                }`}
                  style={isMe
                    ? { backgroundColor: '#273946' }
                    : { borderColor: 'rgba(195,199,204,0.3)' }
                  }
                >
                  {!isMe && msg.profiles?.name && (
                    <p className="text-xs font-medium mb-1" style={{ color: '#2563EB' }}>
                      {msg.profiles.name}
                    </p>
                  )}
                  <p className="text-sm" style={{ color: isMe ? '#ffffff' : '#1A242B' }}>
                    {msg.body}
                  </p>
                  <p className="text-xs mt-1" style={{ color: isMe ? 'rgba(255,255,255,0.6)' : '#9ca3af' }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(195,199,204,0.3)' }}>
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-1"
            style={{ borderColor: 'rgba(195,199,204,0.3)' }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ backgroundColor: '#273946' }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

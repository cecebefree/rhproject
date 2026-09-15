// messageReactionsClient.ts — Fetch and manage message reactions
// Table: public.message_reactions

import { supabase } from '../services/supabase';

export interface MessageReaction {
  messageId: string;
  emoji: string;
  profileName: string | null;
  profileAvatar: string | null;
}

export async function fetchMessageReactions(messageId: string): Promise<{ emoji: string; count: number }[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .schema('public').from('message_reactions')
    .select('emoji, profile_id')
    .eq('message_id', messageId);

  if (error) return [];

  // Count by emoji
  const counts = (data ?? []).reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(counts).map(([emoji, count]) => ({ emoji, count }));
}

export async function reactToMessage(messageId: string, emoji: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  // First check if user already reacted with this emoji
  const { data: existing } = await supabase
    .schema('public').from('message_reactions')
    .select('profile_id')
    .eq('message_id', messageId)
    .eq('emoji', emoji)
    .eq('profile_id', user.id)
    .maybeSingle();

  if (existing) {
    // Remove the reaction
    const { error } = await supabase
      .schema('public').from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('emoji', emoji)
      .eq('profile_id', user.id);

    return !error;
  } else {
    // Add the reaction
    const { error } = await supabase
      .schema('public').from('message_reactions')
      .insert({ message_id: messageId, emoji, profile_id: user.id });

    return !error;
  }
}
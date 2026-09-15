import { useEffect, useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { supabase } from '../services/supabase';

interface ReactionButtonsProps {
  messageId: string;
}

export function ReactionButtons({ messageId }: ReactionButtonsProps) {
  const [ownReactions, setOwnReactions] = useState<Record<string, boolean>>({});
  const [globalReactions, setGlobalReactions] = useState<Record<string, number>>({});

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .schema('public').from('message_reactions')
        .select('emoji')
        .eq('message_id', messageId);

      if (error || !data) return;

      // Count by emoji
      const counts: Record<string, number> = {};
      for (const row of data) {
        counts[row.emoji] = (counts[row.emoji] ?? 0) + 1;
      }
      setGlobalReactions(counts);
    }
    load();
  }, [messageId]);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .schema('public').from('message_reactions')
        .select('emoji')
        .eq('message_id', messageId)
        .eq('profile_id', user.id);

      if (data) {
        const own: Record<string, boolean> = {};
        for (const row of data) {
          own[row.emoji] = true;
        }
        setOwnReactions(own);
      }
    }
    load();
  }, [messageId]);

  const toggleReact = async (emoji: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const isOwn = ownReactions[emoji];

    if (isOwn) {
      // Remove reaction
      await supabase
        .schema('public').from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('emoji', emoji)
        .eq('profile_id', user.id);
    } else {
      // Add reaction
      await supabase
        .schema('public').from('message_reactions')
        .insert({ message_id: messageId, emoji, profile_id: user.id });
    }

    // Refresh global counts
    const { data } = await supabase
      .schema('public').from('message_reactions')
      .select('emoji')
      .eq('message_id', messageId);

    if (data) {
      const counts: Record<string, number> = {};
      for (const row of data) {
        counts[row.emoji] = (counts[row.emoji] ?? 0) + 1;
      }
      setGlobalReactions(counts);
    }

    setOwnReactions((prev) => ({
      ...prev,
      [emoji]: !prev[emoji],
    }));
  };

  return (
    <View style={styles.reactionContainer}>
      {Object.entries(globalReactions).map(([emoji, count]) => (
        <TouchableOpacity
          key={emoji}
          style={[styles.reactionRow, ownReactions[emoji] && styles.reactionSelected]}
          onPress={() => toggleReact(emoji)}
        >
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.emojiCount}>{count}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  reactionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 2,
  },
  emoji: {
    fontSize: 16,
    marginRight: 4,
  },
  emojiCount: {
    fontSize: 12,
    color: '#666',
    minWidth: 16,
    textAlign: 'center',
  },
  reactionSelected: {
    backgroundColor: '#e0e0e0',
  },
});

// GroupChatScreen — Chat adjustments
// Chat view with send states, messages from real DB
// WIRED to real DB — group_messages + group_conversations via groupChatClient

import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingState } from '../../src/components/LoadingState';
import { fetchGroupMessages, type GroupMessage } from '../../src/lib/groupChatClient';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

export default function GroupChatScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchGroupMessages(groupId);
        if (!cancelled) setMessages(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [groupId]);

  if (loading) return <LoadingState />;
  if (error) return <EmptyState title="Error" message={error} />;

  return (
    <View style={styles.container}>
      {/* Messages */}
      <ScrollView style={styles.messagesContainer}>
        {messages.length > 0 ? (
          messages.map((msg) => (
            <View
              key={msg.id}
              style={[styles.messageBubble, msg.isOwn ? styles.ownBubble : styles.otherBubble]}
            >
              {!msg.isOwn && <Text style={styles.senderName}>{msg.senderName}</Text>}
              <Text style={[styles.messageText, msg.isOwn && styles.ownText]}>{msg.content}</Text>
              <Text style={[styles.timestamp, msg.isOwn && styles.ownTimestamp]}>
                {msg.timestamp}
              </Text>
            </View>
          ))
        ) : (
          <EmptyState title="No messages yet" message="Say hello!" />
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={colors.charcoalLight}
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity style={styles.sendButton}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  messagesContainer: {
    flex: 1,
    padding: spacing.md,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: spacing.sm,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  ownBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.burgundy,
  },
  otherBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.ivoryDark,
  },
  senderName: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginBottom: spacing.xs,
  },
  messageText: {
    fontSize: typography.sizes.body,
    color: colors.charcoal,
  },
  ownText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
  },
  ownTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.sm,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.ivoryDark,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.ivoryDark,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.body,
    color: colors.charcoal,
  },
  sendButton: {
    marginLeft: spacing.sm,
    backgroundColor: colors.burgundy,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendText: {
    color: '#fff',
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
  },
});

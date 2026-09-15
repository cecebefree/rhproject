// GroupChatScreen — Chat view with messages from real DB
// Tables: public.group_conversations, public.group_messages
// Realtime: Supabase Realtime subscription for live message delivery

import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingState } from '../../src/components/LoadingState';
import { ReactionButtons } from '../../src/components/ReactionButtons';
import { SendIndicator, ReconnectingBanner, EmptyChat, type SendState } from '../../src/components/chat-ui';
import { fetchGroupMessages, sendMessage, type GroupMessage } from '../../src/lib/groupChatClient';
import { supabase } from '../../src/services/supabase';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

export default function GroupChatScreen() {
  const { groupId, groupName } = useLocalSearchParams<{ groupId: string; groupName?: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendState, setSendState] = useState<SendState>('sent');
  const [isConnected, setIsConnected] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load messages when groupId changes
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

  // Realtime subscription for live message delivery
  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`group_messages:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          // New message arrived — refetch to reconcile
          fetchGroupMessages(groupId).then((msgs) => setMessages(msgs)).catch(console.error);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const handleSend = async () => {
    if (!groupId || !inputText.trim() || sending) return;

    const content = inputText.trim();
    setInputText('');
    setSending(true);
    setSendState('sending');
    Keyboard.dismiss();

    try {
      const newMsg = await sendMessage(groupId, content);
      setMessages((prev) => [...prev, newMsg]);
      setSendState('sent');
    } catch (err) {
      setInputText(content);
      setSendState('failed');
      console.error('Send failed:', err);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <EmptyState title="Error" message={error} />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ReconnectingBanner visible={!isConnected} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {groupName ?? 'Group Chat'}
        </Text>
        <TouchableOpacity
          onPress={() => router.push(`/(tabs)/group-info?groupId=${groupId}`)}
          style={styles.infoButton}
        >
          <Text style={styles.infoText}>ℹ</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length > 0 ? (
          messages.map((msg) => (
            <View
              key={msg.id}
              style={[styles.messageBubble, msg.isOwn ? styles.ownBubble : styles.otherBubble]}
            >
              {!msg.isOwn && <Text style={styles.senderName}>{msg.senderName}</Text>}
              <Text style={[styles.messageText, msg.isOwn && styles.ownText]}>{msg.content}</Text>
              <View style={styles.messageFooter}>
                <Text style={[styles.timestamp, msg.isOwn && styles.ownTimestamp]}>
                  {msg.timestamp}
                </Text>
              </View>
              <ReactionButtons messageId={msg.id} />
            </View>
          ))
        ) : (
          <EmptyChat />
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
          editable={!sending}
        />
        <SendIndicator state={sendState} onRetry={handleSend} />
        <TouchableOpacity
          style={[styles.sendButton, sending && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={sending || !inputText.trim()}
        >
          <Text style={styles.sendText}>{sending ? 'Sending...' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
  },
  backButton: {
    paddingRight: spacing.md,
  },
  backText: {
    fontSize: typography.sizes.h2,
    color: colors.burgundy,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
  },
  infoButton: {
    paddingLeft: spacing.md,
  },
  infoText: {
    fontSize: typography.sizes.h2,
    color: colors.burgundy,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
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
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
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
  sendButtonDisabled: {
    backgroundColor: colors.charcoalLight,
  },
  sendText: {
    color: '#fff',
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
  },
});

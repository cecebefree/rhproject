// GroupChatScreen — Chat adjustments
// Chat view with send states, messages from seed

import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { EmptyState } from '../../src/components/EmptyState';
import { SendIndicator } from '../../src/components/chat-ui';
import { SEED_MESSAGES } from '../../src/seed/messages';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

export default function GroupChatScreen() {
  const [sendState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  return (
    <View style={styles.container}>
      {/* Messages */}
      <ScrollView style={styles.messagesContainer}>
        {SEED_MESSAGES.length > 0 ? (
          SEED_MESSAGES.map((msg) => (
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

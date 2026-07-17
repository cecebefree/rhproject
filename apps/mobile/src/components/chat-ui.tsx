import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

/* G1 -- Send states */
export type SendState = 'sending' | 'sent' | 'failed';

export function SendIndicator({ state, onRetry }: { state: SendState; onRetry?: () => void }) {
  if (state === 'sending') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <ActivityIndicator size={12} color="#999" />
        <Text style={{ fontSize: 11, color: '#999' }}>Sending...</Text>
      </View>
    );
  }
  if (state === 'failed') {
    return (
      <TouchableOpacity
        onPress={onRetry}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        <Text style={{ fontSize: 11, color: '#e74c3c' }}>Failed</Text>
        <Text style={{ fontSize: 11, color: '#e74c3c', fontWeight: '700' }}> Retry</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: 11, color: '#27ae60' }}> Sent</Text>
    </View>
  );
}

/* G2 -- Reconnecting banner */
export function ReconnectingBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View
      style={{
        backgroundColor: '#f39c12',
        paddingVertical: 6,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <ActivityIndicator size={12} color="#fff" />
      <Text style={{ fontSize: 13, color: '#fff', fontWeight: '600' }}>Reconnecting...</Text>
    </View>
  );
}

/* G3 -- Empty states */
export function EmptyGroups() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>[Groups]</Text>
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#333', textAlign: 'center' }}>
        No groups yet
      </Text>
      <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8 }}>
        Groups appear here once you are enrolled in a class or club.
      </Text>
    </View>
  );
}

export function EmptyChat() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>[Chat]</Text>
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#333', textAlign: 'center' }}>
        No messages yet
      </Text>
      <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8 }}>
        Be the first to send a message in this group.
      </Text>
    </View>
  );
}

/* G4 -- Group info view */
export function GroupInfoView({
  group,
  onClose,
}: {
  group: {
    name: string;
    category: string;
    memberCount: number;
    isLead: boolean;
    createdAt: string;
  };
  onClose: () => void;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
      }}
    >
      <View
        style={{
          backgroundColor: 'white',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: 24,
          maxHeight: '70%',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: '700' }}>{group.name}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 18, color: '#999' }}>X</Text>
          </TouchableOpacity>
        </View>
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#666' }}>Category</Text>
            <Text style={{ fontWeight: '500' }}>{group.category}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#666' }}>Members</Text>
            <Text style={{ fontWeight: '500' }}>{group.memberCount}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#666' }}>Group Lead</Text>
            <Text style={{ fontWeight: '500', color: group.isLead ? '#c0392b' : '#666' }}>
              {group.isLead ? 'Yes' : 'No'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#666' }}>Created</Text>
            <Text style={{ fontWeight: '500' }}>{group.createdAt}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

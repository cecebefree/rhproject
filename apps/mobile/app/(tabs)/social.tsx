import { FlatList, Text, View, Switch, Alert } from 'react-native';
import { useState } from 'react';

type Group = {
  id: string;
  name: string;
  category: 'Core' | 'Enrichment' | 'Club' | 'Social' | 'School' | 'Staff' | 'Family';
  memberCount: number;
  isLead: boolean;
  isMuted: boolean;
};

const DEMO_GROUPS: Group[] = [
  { id: '1', name: 'Year 12 — Cambridge Biology', category: 'Core', memberCount: 24, isLead: false, isMuted: false },
  { id: '2', name: 'Creative Writing Club', category: 'Club', memberCount: 12, isLead: true, isMuted: false },
  { id: '3', name: 'SAT Prep Enrichment', category: 'Enrichment', memberCount: 8, isLead: false, isMuted: true },
];

function GroupCard({ group }: { group: Group }) {
  const [muted, setMuted] = useState(group.isMuted);

  const handleLeave = () => {
    if (group.category === 'Social') {
      Alert.alert('Leave Group', 'Are you sure?');
    } else {
      Alert.alert('Cannot Leave', 'Enrolment-derived groups cannot be left. Use mute instead.');
    }
  };

  return (
    <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#e0e0e0' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>{group.name}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <Text style={{ fontSize: 12, color: '#666' }}>{group.category}</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>{group.memberCount} members</Text>
            {group.isLead && <Text style={{ fontSize: 12, color: '#c0392b', fontWeight: '700' }}>Lead</Text>}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 12 }}>Mute</Text>
            <Switch value={muted} onValueChange={setMuted} />
          </View>
          <Text onPress={handleLeave} style={{ fontSize: 12, color: '#e74c3c' }}>Leave</Text>
        </View>
      </View>
    </View>
  );
}

export default function SocialScreen() {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, borderBottomWidth: 2, borderColor: '#1a2330' }}>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>My Groups</Text>
      </View>
      <FlatList
        data={DEMO_GROUPS}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => <GroupCard group={item} />}
      />
    </View>
  );
}

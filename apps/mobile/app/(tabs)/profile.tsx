import { Text, View, FlatList, TouchableOpacity } from 'react-native';

type Group = {
  id: string;
  name: string;
  category: string;
  memberCount: number;
  isLead: boolean;
};

const MIRROR_GROUPS: Group[] = [
  { id: '1', name: 'Year 12 -- Cambridge Biology', category: 'Core', memberCount: 24, isLead: false },
  { id: '2', name: 'Creative Writing Club', category: 'Club', memberCount: 12, isLead: true },
];

function GroupRow({ group }: { group: Group }) {
  return (
    <View style={{ paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#f0f0f0' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '500' }}>{group.name}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
            <Text style={{ fontSize: 12, color: '#666' }}>{group.category}</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>{group.memberCount} members</Text>
            {group.isLead && <Text style={{ fontSize: 12, color: '#c0392b', fontWeight: '700' }}>Lead</Text>}
          </View>
        </View>
        <Text style={{ fontSize: 12, color: '#2980b9' }}>Open</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ padding: 16, backgroundColor: 'white', borderBottomWidth: 2, borderColor: '#1a2330' }}>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Profile</Text>
      </View>
      <View style={{ padding: 16, backgroundColor: 'white', margin: 16, borderRadius: 12, overflow: 'hidden' }}>
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 4 }}>Alex Rider</Text>
        <Text style={{ fontSize: 14, color: '#666' }}>@alex.rider</Text>
        <Text style={{ fontSize: 14, color: '#666' }}>RH-2026-00042</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <TouchableOpacity style={{ backgroundColor: '#1a2330', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
            <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ backgroundColor: 'white', marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' }}>
        <Text style={{ fontSize: 16, fontWeight: '700', padding: 16, paddingBottom: 8 }}>My Groups</Text>
        <FlatList
          data={MIRROR_GROUPS}
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => <GroupRow group={item} />}
          scrollEnabled={false}
        />
      </View>
    </View>
  );
}

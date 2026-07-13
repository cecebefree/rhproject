import { FlatList, Text, View } from 'react-native';

type ChildSummary = {
  id: string;
  name: string;
  groups: number;
  attendance: string;
};

const DEMO_CHILDREN: ChildSummary[] = [
  { id: '1', name: 'Alice Smith', groups: 3, attendance: '92%' },
  { id: '2', name: 'James Smith', groups: 2, attendance: '88%' },
];

function ChildCard({ child }: { child: ChildSummary }) {
  return (
    <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#e0e0e0' }}>
      <Text style={{ fontSize: 16, fontWeight: '600' }}>{child.name}</Text>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
        <View>
          <Text style={{ fontSize: 12, color: '#666' }}>Groups</Text>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>{child.groups}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 12, color: '#666' }}>Attendance</Text>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>{child.attendance}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 12, color: '#2980b9', marginTop: 8 }}>View details →</Text>
    </View>
  );
}

export default function FamilyScreen() {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, borderBottomWidth: 2, borderColor: '#1a2330' }}>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Family Overview</Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>Read-only view of linked children</Text>
      </View>
      <FlatList
        data={DEMO_CHILDREN}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <ChildCard child={item} />}
      />
    </View>
  );
}

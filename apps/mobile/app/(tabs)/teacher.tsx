import { FlatList, Text, View, Switch } from 'react-native';
import { useState } from 'react';

type ClassGroup = {
  id: string;
  name: string;
  studentCount: number;
  isLead: boolean;
  mediaEnabled: boolean;
};

const DEMO_CLASSES: ClassGroup[] = [
  { id: '1', name: 'Year 12 — Cambridge Biology', studentCount: 24, isLead: true, mediaEnabled: false },
  { id: '2', name: 'Year 11 — IB Chemistry', studentCount: 18, isLead: true, mediaEnabled: false },
  { id: '3', name: 'Year 10 — Home School Maths', studentCount: 12, isLead: false, mediaEnabled: false },
];

function ClassCard({ group }: { group: ClassGroup }) {
  const [mediaOn, setMediaOn] = useState(group.mediaEnabled);

  return (
    <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#e0e0e0' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>{group.name}</Text>
          <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{group.studentCount} students</Text>
          {group.isLead && <Text style={{ fontSize: 12, color: '#c0392b', fontWeight: '700', marginTop: 2 }}>Group Lead</Text>}
        </View>
        {group.isLead && (
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={{ fontSize: 12 }}>Media sharing</Text>
            <Switch value={mediaOn} onValueChange={setMediaOn} />
          </View>
        )}
      </View>
    </View>
  );
}

export default function TeacherScreen() {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, borderBottomWidth: 2, borderColor: '#1a2330' }}>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>My Classes</Text>
      </View>
      <FlatList
        data={DEMO_CLASSES}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => <ClassCard group={item} />}
      />
    </View>
  );
}

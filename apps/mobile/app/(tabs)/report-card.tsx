import { FlatList, Text, View } from 'react-native';

type ReportCard = {
  id: string;
  term: string;
  subject: string;
  grade: string;
  status: 'draft' | 'released' | 'visible';
};

const DEMO_CARDS: ReportCard[] = [
  { id: '1', term: 'Summer 2026', subject: 'Biology', grade: 'A', status: 'visible' },
  { id: '2', term: 'Summer 2026', subject: 'Chemistry', grade: 'B+', status: 'visible' },
  { id: '3', term: 'Summer 2026', subject: 'Mathematics', grade: null, status: 'draft' },
];

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft (teacher)',
  released: 'Released (office)',
  visible: 'Available',
};

const STATUS_COLOR: Record<string, string> = {
  draft: '#f39c12',
  released: '#2980b9',
  visible: '#27ae60',
};

function CardRow({ card }: { card: ReportCard }) {
  return (
    <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#e0e0e0' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>{card.subject}</Text>
          <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{card.term}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          {card.grade && <Text style={{ fontSize: 20, fontWeight: '700' }}>{card.grade}</Text>}
          <View style={{
            backgroundColor: STATUS_COLOR[card.status] + '20',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 4,
          }}>
            <Text style={{ fontSize: 11, color: STATUS_COLOR[card.status], fontWeight: '600' }}>
              {STATUS_LABEL[card.status]}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function ReportCardScreen() {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, borderBottomWidth: 2, borderColor: '#1a2330' }}>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Report Cards</Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>Summer 2026 — Termly results</Text>
      </View>
      <FlatList
        data={DEMO_CARDS}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <CardRow card={item} />}
      />
      <View style={{ padding: 16, backgroundColor: '#f8f9fa' }}>
        <Text style={{ fontSize: 13, color: '#666' }}>
          Draft cards visible only to teachers. Released by Office Desk.
        </Text>
      </View>
    </View>
  );
}

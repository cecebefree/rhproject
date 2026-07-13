import { FlatList, Text, View, TouchableOpacity } from 'react-native';

type Invoice = {
  id: string;
  date: string;
  description: string;
  amount: string;
  status: 'paid' | 'pending' | 'overdue';
};

type ChildLedger = {
  childName: string;
  balance: string;
  invoices: Invoice[];
};

const DEMO_LEDGER: ChildLedger[] = [
  {
    childName: 'Alice Smith',
    balance: chr(163) + '1,250.00',
    invoices: [
      { id: 'inv-1', date: '2026-06-01', description: 'Summer Term Tuition', amount: chr(163) + '2,400.00', status: 'paid' },
      { id: 'inv-2', date: '2026-05-15', description: 'Biology Lab Fee', amount: chr(163) + '75.00', status: 'paid' },
      { id: 'inv-3', date: '2026-07-01', description: 'Enrichment: SAT Prep', amount: chr(163) + '495.00', status: 'pending' },
    ],
  },
  {
    childName: 'James Smith',
    balance: chr(163) + '1,975.00',
    invoices: [
      { id: 'inv-4', date: '2026-06-01', description: 'Summer Term Tuition', amount: chr(163) + '2,400.00', status: 'paid' },
      { id: 'inv-5', date: '2026-07-01', description: 'IB Chemistry Kit', amount: chr(163) + '120.00', status: 'overdue' },
      { id: 'inv-6', date: '2026-07-01', description: 'Enrichment: Creative Writing', amount: chr(163) + '295.00', status: 'pending' },
    ],
  },
];

const STATUS_STYLE = {
  paid:    { label: 'Paid',    color: '#27ae60', bg: '#27ae6020' },
  pending: { label: 'Pending', color: '#f39c12', bg: '#f39c1220' },
  overdue: { label: 'Overdue', color: '#e74c3c', bg: '#e74c3c20' },
};

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const s = STATUS_STYLE[invoice.status];
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#f0f0f0' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '500' }}>{invoice.description}</Text>
        <Text style={{ fontSize: 12, color: '#666' }}>{invoice.date}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: '600' }}>{invoice.amount}</Text>
        <View style={{ backgroundColor: s.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
          <Text style={{ fontSize: 11, color: s.color, fontWeight: '600' }}>{s.label}</Text>
        </View>
      </View>
    </View>
  );
}

function ChildSection({ child }: { child: ChildLedger }) {
  return (
    <View style={{ marginBottom: 16, backgroundColor: 'white', borderRadius: 8, overflow: 'hidden' }}>
      <View style={{ padding: 16, backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderColor: '#e0e0e0' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>{child.childName}</Text>
          <TouchableOpacity>
            <Text style={{ fontSize: 13, color: '#2980b9' }}>Records &gt;</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
          <View>
            <Text style={{ fontSize: 11, color: '#666' }}>Outstanding Balance</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#e74c3c' }}>{child.balance}</Text>
          </View>
        </View>
      </View>
      <View style={{ paddingVertical: 8, backgroundColor: '#fafafa' }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#666', paddingHorizontal: 16, marginBottom: 4 }}>INVOICES</Text>
      </View>
      {child.invoices.map((inv) => <InvoiceRow key={inv.id} invoice={inv} />)}
    </View>
  );
}

export default function FamilyScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ padding: 16, backgroundColor: 'white', borderBottomWidth: 2, borderColor: '#1a2330' }}>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Family Ledger</Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>Fees, invoices, and Records per child</Text>
      </View>
      <FlatList
        data={DEMO_LEDGER}
        keyExtractor={(c) => c.childName}
        renderItem={({ item }) => <ChildSection child={item} />}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
}

import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingState } from '../../src/components/LoadingState';
import { supabase } from '../../src/services/supabase';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

interface InvoiceDetail {
  id: string;
  invoice_number: string | null;
  description: string | null;
  amount: number;
  amount_paid: number;
  currency: string;
  status: string;
  due_date: string | null;
  created_at: string;
  paid_at: string | null;
  payment_method: string | null;
  payment_processor: string | null;
}

interface PaymentItem {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  payment_method: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#9CA3AF',
  sent: '#D97706',
  issued: '#D97706',
  paid: '#059669',
  overdue: '#C8281E',
  cancelled: '#6B7280',
  void: '#6B7280',
};

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadInvoice(id);
  }, [id]);

  async function loadInvoice(invoiceId: string) {
    setLoading(true);
    setError(null);

    const { data: inv, error: invErr } = await supabase
      .from('office_desk.invoices' as any)
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invErr || !inv) {
      setError('Invoice not found');
      setLoading(false);
      return;
    }

    setInvoice(inv as any);

    // Load payments for this invoice
    const { data: pays } = await supabase
      .from('office_desk.payments' as any)
      .select('id, amount, status, created_at, payment_method')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false });

    setPayments((pays as any) || []);
    setLoading(false);
  }

  if (loading) return <LoadingState />;
  if (error) return <EmptyState message={error} />;
  if (!invoice) return <EmptyState message="Invoice not found" />;

  const balance = invoice.amount - invoice.amount_paid;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{invoice.invoice_number || 'Invoice'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[invoice.status] || '#9CA3AF' }]}>
          <Text style={styles.statusText}>{invoice.status}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Details</Text>
        {invoice.description && (
          <View style={styles.row}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.value}>{invoice.description}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Amount</Text>
          <Text style={styles.value}>R {invoice.amount.toLocaleString()}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Paid</Text>
          <Text style={[styles.value, { color: invoice.amount_paid > 0 ? '#059669' : colors.charcoalLight }]}>
            R {invoice.amount_paid.toLocaleString()}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Balance Due</Text>
          <Text style={[styles.value, { color: balance > 0 ? '#C8281E' : '#059669', fontWeight: '600' }]}>
            R {balance.toLocaleString()}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Due Date</Text>
          <Text style={styles.value}>
            {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Created</Text>
          <Text style={styles.value}>{new Date(invoice.created_at).toLocaleDateString()}</Text>
        </View>
        {invoice.paid_at && (
          <View style={styles.row}>
            <Text style={styles.label}>Paid On</Text>
            <Text style={[styles.value, { color: '#059669' }]}>{new Date(invoice.paid_at).toLocaleDateString()}</Text>
          </View>
        )}
        {invoice.payment_method && (
          <View style={styles.row}>
            <Text style={styles.label}>Payment Method</Text>
            <Text style={styles.value}>{invoice.payment_method}</Text>
          </View>
        )}
      </View>

      {payments.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          {payments.map((p) => (
            <View key={p.id} style={styles.paymentRow}>
              <View>
                <Text style={styles.paymentAmount}>R {p.amount.toLocaleString()}</Text>
                <Text style={styles.paymentDate}>{new Date(p.created_at).toLocaleDateString()}</Text>
              </View>
              <View style={[styles.paymentBadge, { backgroundColor: p.status === 'completed' ? '#D1FAE5' : '#FEF3C7' }]}>
                <Text style={[styles.paymentStatus, { color: p.status === 'completed' ? '#059669' : '#D97706' }]}>
                  {p.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ivory },
  header: {
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
  },
  title: { fontSize: typography.sizes.h2, fontWeight: typography.weights.bold, color: colors.charcoal },
  card: {
    backgroundColor: '#fff',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.ivoryDark,
  },
  sectionTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
  },
  label: { fontSize: typography.sizes.body, color: colors.charcoalLight },
  value: { fontSize: typography.sizes.body, color: colors.charcoal, textAlign: 'right', flex: 1, marginLeft: spacing.sm },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusText: { color: '#fff', fontSize: typography.sizes.badge, fontWeight: typography.weights.medium, textTransform: 'capitalize' },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
  },
  paymentAmount: { fontSize: typography.sizes.body, fontWeight: typography.weights.medium, color: colors.charcoal },
  paymentDate: { fontSize: typography.sizes.caption, color: colors.charcoalLight },
  paymentBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  paymentStatus: { fontSize: typography.sizes.badge, fontWeight: typography.weights.medium, textTransform: 'capitalize' },
});

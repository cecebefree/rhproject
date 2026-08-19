// src/components/PaymentHistoryList.tsx
// Row 98: Payment history list with amount, status, date, receipt link

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { PaymentRecord } from '../types/profile';
import { PAYMENT_STATUS_COLORS } from '../types/profile';

interface PaymentHistoryListProps {
  payments: PaymentRecord[];
  onPaymentPress?: (payment: PaymentRecord) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function PaymentRow({
  payment,
  onPress,
}: {
  payment: PaymentRecord;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.description} numberOfLines={1}>
          {payment.description ?? payment.invoice_number ?? 'Payment'}
        </Text>
        <Text style={styles.date}>{formatDate(payment.paid_at ?? payment.created_at)}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.amount}>{formatAmount(payment.amount, payment.currency)}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: PAYMENT_STATUS_COLORS[payment.status] ?? colors.charcoalLight },
          ]}
        >
          <Text style={styles.statusText}>{payment.status}</Text>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

export function PaymentHistoryList({ payments, onPaymentPress }: PaymentHistoryListProps) {
  if (payments.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No payment history</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {payments.map((p) => (
        <PaymentRow
          key={p.id}
          payment={p}
          onPress={onPaymentPress ? () => onPaymentPress(p) : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.ivoryDark,
  },
  rowLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  description: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    color: colors.charcoal,
    marginBottom: 2,
  },
  date: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
  },
  amount: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: typography.sizes.badge,
    color: '#fff',
    fontWeight: typography.weights.medium,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
});

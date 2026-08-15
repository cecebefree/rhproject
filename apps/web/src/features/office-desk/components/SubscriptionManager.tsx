// SubscriptionManager — Manage tenant subscriptions via Stripe + PayPal (Row 27)
// Displays current plans, upgrade/downgrade/cancel actions, dual processor support

import { useEffect, useState } from 'react';
import {
  selectSubscriptions,
  getStripeCustomer,
  createSubscription,
  cancelSubscription,
  type Subscription,
  type PlanId,
  type PaymentProcessor,
  PLAN_LABELS,
} from '../services/supabase';

interface SubscriptionManagerProps {
  tenantId: string;
}

export function SubscriptionManager({ tenantId }: SubscriptionManagerProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Plan selector
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('pro');
  const [selectedInterval, setSelectedInterval] = useState<'month' | 'year'>('month');
  const [selectedProcessor, setSelectedProcessor] = useState<'stripe' | 'paypal' | 'both'>('stripe');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error: fetchError } = await selectSubscriptions(tenantId);
      if (!cancelled) {
        if (fetchError) setError(fetchError.message);
        else if (data) setSubscriptions(data as Subscription[]);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tenantId]);

  const activeSubscriptions = subscriptions.filter((s) => s.status === 'active');
  const cancelledSubscriptions = subscriptions.filter((s) => s.status === 'cancelled');

  const handleCreate = async () => {
    setCreating(true);
    setError(null);

    const { data, error: createError } = await createSubscription({
      tenant_id: tenantId,
      plan_id: selectedPlan,
      processor: selectedProcessor,
      billing_interval: selectedInterval,
    });

    if (createError || !data?.success) {
      setError(createError?.message || 'Failed to create subscription');
    } else {
      // Reload subscriptions
      const { data: refreshed } = await selectSubscriptions(tenantId);
      if (refreshed) setSubscriptions(refreshed as Subscription[]);
    }

    setCreating(false);
  };

  const handleCancel = async (subscriptionId: string) => {
    const { error: cancelError } = await cancelSubscription(subscriptionId);
    if (cancelError) {
      setError(cancelError.message);
    } else {
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id === subscriptionId
            ? { ...s, status: 'cancelled' as const, cancel_at_period_end: true }
            : s
        )
      );
    }
  };

  if (loading) return <div style={{ padding: '16px', color: '#718096' }}>Loading subscriptions...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#2d3748' }}>
        Subscription Management
      </h3>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Active Subscriptions */}
      {activeSubscriptions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>
            Active Subscriptions
          </h4>
          {activeSubscriptions.map((sub) => {
            const plan = PLAN_LABELS[sub.plan_id] || { name: sub.plan_id, priceMonthly: 0, priceYearly: 0 };
            const daysUntilRenewal = sub.current_period_end
              ? Math.max(0, Math.ceil((new Date(sub.current_period_end).getTime() - Date.now()) / 86400000))
              : null;

            return (
              <div
                key={sub.id}
                style={{
                  padding: '16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '15px', color: '#2d3748' }}>
                      {plan.name}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      backgroundColor: sub.processor === 'stripe' ? '#ebf8ff' : '#fffbeb',
                      color: sub.processor === 'stripe' ? '#2b6cb0' : '#92400e',
                    }}>
                      {sub.processor === 'stripe' ? 'Stripe' : 'PayPal'}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#718096' }}>
                    ${sub.amount_monthly}/mo ({sub.billing_interval})
                  </div>
                  {sub.current_period_end && (
                    <div style={{ fontSize: '12px', color: '#a0aec0' }}>
                      {daysUntilRenewal !== null ? `Renews in ${daysUntilRenewal} days` : 'Active'}
                      {sub.cancel_at_period_end && ' (cancels at period end)'}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleCancel(sub.id)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#e53e3e',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>
          {activeSubscriptions.length > 0 ? 'Change Plan' : 'Select Plan'}
        </h4>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {(['starter', 'pro', 'enterprise'] as PlanId[]).map((planId) => {
            const plan = PLAN_LABELS[planId];
            const price = selectedInterval === 'month' ? plan.priceMonthly : plan.priceYearly;
            const isActive = activeSubscriptions.some((s) => s.plan_id === planId);

            return (
              <button
                key={planId}
                type="button"
                onClick={() => setSelectedPlan(planId)}
                style={{
                  padding: '16px',
                  border: `2px solid ${selectedPlan === planId ? '#3182ce' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  backgroundColor: selectedPlan === planId ? '#ebf8ff' : 'white',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#2d3748' }}>
                  {plan.name}
                </div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#2d3748', margin: '8px 0' }}>
                  ${price}
                </div>
                <div style={{ fontSize: '12px', color: '#718096' }}>
                  /{selectedInterval === 'month' ? 'mo' : 'yr'}
                </div>
                {isActive && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#38a169', fontWeight: '500' }}>
                    Current
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Interval selector */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setSelectedInterval('month')}
            style={{
              flex: 1,
              padding: '8px',
              border: `1px solid ${selectedInterval === 'month' ? '#3182ce' : '#e2e8f0'}`,
              borderRadius: '6px',
              backgroundColor: selectedInterval === 'month' ? '#ebf8ff' : 'white',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setSelectedInterval('year')}
            style={{
              flex: 1,
              padding: '8px',
              border: `1px solid ${selectedInterval === 'year' ? '#3182ce' : '#e2e8f0'}`,
              borderRadius: '6px',
              backgroundColor: selectedInterval === 'year' ? '#ebf8ff' : 'white',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            Yearly (Save 2 months)
          </button>
        </div>

        {/* Processor selector */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['stripe', 'paypal', 'both'] as const).map((proc) => (
            <button
              key={proc}
              type="button"
              onClick={() => setSelectedProcessor(proc)}
              style={{
                flex: 1,
                padding: '8px',
                border: `1px solid ${selectedProcessor === proc ? '#3182ce' : '#e2e8f0'}`,
                borderRadius: '6px',
                backgroundColor: selectedProcessor === proc ? '#ebf8ff' : 'white',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                textTransform: 'capitalize',
              }}
            >
              {proc === 'both' ? 'Stripe + PayPal' : proc}
            </button>
          ))}
        </div>

        {/* Create button */}
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          style={{
            padding: '12px 24px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#3182ce',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            cursor: creating ? 'not-allowed' : 'pointer',
            opacity: creating ? 0.6 : 1,
          }}
        >
          {creating ? 'Creating...' : 'Create Subscription'}
        </button>
      </div>

      {/* Cancelled Subscriptions */}
      {cancelledSubscriptions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#a0aec0' }}>
            Cancelled Subscriptions
          </h4>
          {cancelledSubscriptions.map((sub) => {
            const plan = PLAN_LABELS[sub.plan_id] || { name: sub.plan_id };
            return (
              <div
                key={sub.id}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  backgroundColor: '#f7fafc',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '13px', color: '#a0aec0' }}>
                  {plan.name} ({sub.processor}) — Cancelled
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

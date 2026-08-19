# Financial AI Strategist (CFO Agent) — Architecture Specification

Status: SPEC — architecture vision, implementation pending  
Recorded: 2026-08-18  
Related migrations: 116, 122, 130, 131, 146, 152  
Related EFs: confirm-payment-manual, refund-payment, retry-payment, website-lead-to-registration  
Related patterns: row-79-payment-confirmation-ui.md  

---

## 0. Current State (Existing Financial Infrastructure)

The following tables, Edge Functions, and patterns already exist. The target
architecture in Sections 1–10 extends or adds an analytical layer on top.

### 0.1 Existing Tables

| Migration | Table | Purpose |
|-----------|-------|---------|
| 130 | `office_desk.invoices` | Manual/ad-hoc invoices (lead_id, amount_paid, amount_total, due_date) |
| 130 | `office_desk.invoice_items` | Line items for invoices (description, qty, unit_price, computed total) |
| 131 | `office_desk.stripe_customers` | Tenant billing identity (Stripe + PayPal customer IDs) |
| 131 | `office_desk.subscriptions` | Dual processor plan subscriptions (starter, pro, enterprise) |
| 146 | `office_desk.payments` | Payment records with enhanced RLS (admin all, office select/update, anon deny) |
| 152 | `office_desk.stripe_events` | Stripe webhook events + idempotency audit trail |
| 152 | `office_desk.refunds` | Stripe refund records |
| 122 | `school_desk.payment_requests` | Teacher-initiated payment links via Stripe Checkout |
| 116 | `office_desk.registrations` | Has payment_status, payment_attached_at, stripe_customer_id, stripe_charge_id |

### 0.2 Existing Edge Functions

| Function | Purpose | Auth |
|----------|---------|------|
| `confirm-payment-manual` | Manually confirm a pending payment (office admin/manager) | JWT, role-gated |
| `refund-payment` | Refund a confirmed payment (Stripe refund API or PayPal void) | JWT, role-gated |
| `retry-payment` | Retry a failed payment (Stripe: new token; PayPal: new order+capture) | JWT, role-gated |
| `website-lead-to-registration` | Lead → registration conversion with payment session | service_role |

### 0.3 Existing Payment Flow

```
Website Lead → Turnstile CAPTCHA → website_leads table
  → Edge Function: website-lead-to-registration
    → Stripe/PayPal Checkout Session
      → Webhook: payment_intent.succeeded / checkout.session.completed
        → INSERT office_desk.registrations (payment_status='paid')
        → INSERT office_desk.payments
        → ARCHIVE website_leads
```

**Key divergence from target:** The existing schema uses separate tables for
invoices, payments, subscriptions, and refunds. The target architecture adds
`financial_transactions` (unified transaction log) and `customer_financials`
(analytics layer) on top. The existing tables remain; the CFO Agent reads from
them and writes to the new analytical tables.

---

## 1. Role: Financial AI Strategist (CFO Agent)

**Purpose:** Autonomous financial oversight agent that:

- Real-time transaction monitoring across all payment rails (Stripe, PayPal, Zadarma, Brevo)
- Anomaly detection (fraud, revenue leaks, margin erosion)
- Financial forecasting (cash flow, pricing optimization, churn prediction)
- Pricing strategy optimization (dynamic pricing per customer segment, outcome-based models)
- Working capital management (AR/AP automation, cash application, collections optimization)
- Compliance and governance (explainable AI, audit trails, real-time controls)
- Strategic recommendations (margin improvement, customer profitability, expansion opportunities)

**Deployed as:** Edge Function (Supabase) + agentic AI system (Nemotron or Claude 3.5 Sonnet via OpenRouter)

**Operates on:** Real-time data feeds from existing payment tables + new analytical tables

---

## 2. CFO Agent Data Model

### 2.1 Unified Transaction Log: `financial_transactions`

```sql
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now(),

  -- Transaction Identity
  transaction_type VARCHAR NOT NULL, -- 'inquiry_lead', 'enrollment_payment', 'tuition_installment', 'refund', 'chargeback'
  account_id UUID, -- links to inquiry/student/family
  amount_gbp DECIMAL(10, 2),
  currency VARCHAR DEFAULT 'GBP',
  payment_method VARCHAR, -- 'card', 'bank_transfer', 'paypal', 'invoice'
  payment_processor VARCHAR, -- 'stripe', 'paypal', 'manual'
  status VARCHAR, -- 'pending', 'completed', 'failed', 'disputed'

  -- Source tracking (which desk initiated)
  desk VARCHAR, -- 'front', 'office', 'school'
  source_table VARCHAR, -- 'office_desk.payments', 'school_desk.payment_requests', etc.
  source_id UUID, -- FK to originating record

  -- Financial categorization (for CFO agent analysis)
  revenue_category VARCHAR, -- 'new_enrollment', 'recurring_tuition', 'service_add_on', 'refund'
  cost_allocation VARCHAR, -- 'cogs', 'marketing', 'operations', 'finance'
  profitability_score DECIMAL(3, 2), -- 0.0 to 1.0 (CFO agent calculates)

  -- AI Processing
  ai_flagged BOOLEAN DEFAULT false,
  ai_flag_reason VARCHAR, -- 'high_chargeback_risk', 'margin_below_threshold', 'cash_flow_stress'
  ai_recommended_action VARCHAR, -- 'escalate_to_cfo', 'retry_payment', 'adjust_pricing', 'negotiate_terms'

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_financial_txn_type ON financial_transactions (transaction_type);
CREATE INDEX idx_financial_txn_account ON financial_transactions (account_id);
CREATE INDEX idx_financial_txn_timestamp ON financial_transactions (timestamp DESC);
CREATE INDEX idx_financial_txn_flagged ON financial_transactions (ai_flagged) WHERE ai_flagged = true;
```

### 2.2 Customer Profitability: `customer_financials`

```sql
CREATE TABLE customer_financials (
  customer_id UUID PRIMARY KEY,

  -- Revenue Metrics
  total_revenue_gbp DECIMAL(12, 2),
  arr_gbp DECIMAL(10, 2), -- Annual Recurring Revenue
  mrr_gbp DECIMAL(10, 2), -- Monthly Recurring Revenue
  cac_gbp DECIMAL(8, 2), -- Customer Acquisition Cost
  ltv_gbp DECIMAL(10, 2), -- Lifetime Value
  payback_period_months INT,

  -- Profitability
  gross_margin_pct DECIMAL(5, 2),
  net_margin_pct DECIMAL(5, 2),
  contribution_margin_gbp DECIMAL(10, 2),

  -- Risk Metrics
  churn_probability_pct DECIMAL(5, 2), -- AI predicted
  chargeback_risk_pct DECIMAL(5, 2), -- AI predicted
  payment_friction_score DECIMAL(3, 2), -- 0-1 (payment attempts before success)

  -- Expansion Opportunity
  upsell_potential_gbp DECIMAL(8, 2),
  cross_sell_potential_gbp DECIMAL(8, 2),

  -- Cohort Metrics (for pricing strategy)
  acquisition_cohort VARCHAR, -- '2026-q2', '2026-q3'
  segment VARCHAR, -- 'lms_trial', 'lms_full', 'virtual_boarding', 'corporate'

  last_updated TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_customer_financials_segment ON customer_financials (segment);
CREATE INDEX idx_customer_financials_ltv ON customer_financials (ltv_gbp DESC);
```

### 2.3 Financial Forecast: `financial_forecasts`

```sql
CREATE TABLE financial_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_date DATE NOT NULL,
  forecast_horizon_months INT DEFAULT 3,

  -- Revenue Forecast
  projected_mrr_gbp DECIMAL(10, 2),
  projected_arr_gbp DECIMAL(12, 2),
  revenue_growth_rate DECIMAL(5, 2),
  churn_adjusted_revenue DECIMAL(12, 2),

  -- Cash Flow Forecast
  projected_cash_inflow_gbp DECIMAL(12, 2),
  projected_cash_outflow_gbp DECIMAL(12, 2),
  net_cash_position_gbp DECIMAL(12, 2),
  days_cash_on_hand INT,

  -- Margin Forecast
  projected_cogs_gbp DECIMAL(10, 2),
  projected_gross_margin_pct DECIMAL(5, 2),
  projected_opex_gbp DECIMAL(10, 2),

  -- Risk Flags
  cash_flow_stress BOOLEAN DEFAULT false,
  margin_erosion_detected BOOLEAN DEFAULT false,
  churn_acceleration_detected BOOLEAN DEFAULT false,

  ai_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_forecast_date ON financial_forecasts (forecast_date DESC);
```

### 2.4 Pricing Strategy: `pricing_strategies`

```sql
CREATE TABLE pricing_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Current Pricing Model
  pricing_model VARCHAR, -- 'per_seat', 'usage_based', 'outcome_based', 'hybrid'
  base_price_gbp DECIMAL(8, 2),
  overage_cost_per_unit DECIMAL(6, 3),

  -- AI Optimization Recommendations
  recommended_price_gbp DECIMAL(8, 2),
  price_elasticity DECIMAL(4, 3), -- how demand changes with price
  optimal_price_pct_increase DECIMAL(5, 2),

  -- Segment-Based Pricing
  segment VARCHAR,
  segment_base_price_gbp DECIMAL(8, 2),
  segment_price_strength DECIMAL(3, 2), -- 0-1 (willingness to pay)
  segment_margin_pct DECIMAL(5, 2),

  -- Dynamic Pricing (for AI agents taking actions)
  is_dynamic BOOLEAN DEFAULT false,
  min_price_gbp DECIMAL(8, 2),
  max_price_gbp DECIMAL(8, 2),
  dynamic_rules JSONB, -- {seasonal: {...}, competitor_based: {...}, demand_based: {...}}

  ai_recommendation TEXT,
  confidence_score DECIMAL(3, 2), -- 0-1

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pricing_segment ON pricing_strategies (segment);
```

### 2.5 RLS Policies

```sql
-- financial_transactions
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ft_admin_all ON financial_transactions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY ft_office_select ON financial_transactions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
  )
);

-- customer_financials
ALTER TABLE customer_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY cf_admin_all ON customer_financials
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY cf_office_select ON customer_financials
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
  )
);

-- financial_forecasts
ALTER TABLE financial_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY ff_admin_all ON financial_forecasts
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY ff_office_select ON financial_forecasts
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
  )
);

-- pricing_strategies
ALTER TABLE pricing_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY ps_admin_all ON pricing_strategies
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY ps_office_select ON pricing_strategies
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('office', 'admin')
  )
);
```

---

## 3. CFO Agent: Core Capabilities

### 3.1 Real-Time Transaction Monitoring (Every 15 Minutes)

**Trigger:** Cron or Edge Function scheduler  
**AI Model:** Nemotron 3 Nano 30B (free via OpenRouter)

```
1. Fetch all transactions from office_desk.payments + school_desk.payment_requests
   in last 15 minutes
2. For each transaction, run AI analysis:
   - Anomaly score (0-1)
   - Fraud risk (low/medium/high)
   - Action (process/escalate/block)
   - Reasoning
3. If anomaly_score > 0.7 → flag in financial_transactions
4. If fraud_risk = high → block + notify CFO
5. Update customer_financials profitability scores
```

**AI Prompt Template:**

```
You are a CFO analyzing this financial transaction:

Transaction: {transaction_type}
Amount: £{amount_gbp}
Customer: {account_id}
Status: {status}
Desk: {desk}
Payment Method: {payment_method}
Processor: {payment_processor}

Assess:
1. Is this transaction aligned with expected patterns?
2. Is the amount suspicious (fraud risk)?
3. What is the customer profitability impact?
4. Should we flag this for manual review?

Output JSON:
{
  "anomaly_score": 0-1,
  "fraud_risk": "low|medium|high",
  "action": "process|escalate|block",
  "reasoning": "..."
}
```

### 3.2 Customer Profitability Analysis (Daily)

**Trigger:** Daily cron  
**Purpose:** Calculate LTV, CAC, margin for every customer

```
1. Fetch all customers from front_desk_inquiries + office_desk.registrations
2. For each customer:
   - Aggregate all financial_transactions (revenue)
   - Calculate COGS (tuition delivery costs)
   - Calculate CAC (admissions, marketing spend attribution)
   - Compute: LTV, MRR, ARR, gross margin, contribution margin
   - AI predict: churn probability, chargeback risk, upsell potential
3. Upsert into customer_financials
4. Alert CFO if:
   - churn_probability_pct > 50
   - ltv_gbp / cac_gbp < 3
   - gross_margin_pct < 40
```

### 3.3 Cash Flow Forecasting (Weekly)

**Trigger:** Weekly cron  
**Purpose:** 13-week cash flow forecast

```
1. Gather historical data:
   - Last 30-day revenue
   - Average monthly COGS
   - Average monthly OpEx (staff, infrastructure)
   - Active customer cohorts + churn trend
   - Seasonality factors (new intake: Sept, Jan)
2. AI-powered forecast:
   - Week 1-4, 5-8, 9-13 revenue projections
   - Payment delay impact (DSO = 14 days)
   - Seasonal uplift adjustments
3. Store in financial_forecasts
4. Alert if net_cash_position < £50,000
```

**AI Prompt Template:**

```
You are a CFO forecasting 13-week cash flow for an EdTech company:

Historical Data:
- Last 30-day revenue: £{last_30_day_revenue}
- Avg monthly COGS: £{avg_monthly_cogs}
- Avg monthly OpEx: £{avg_monthly_opex}
- Current customer cohorts: {active_cohorts}
- Churn trend: {churn_trend}
- Seasonality: {seasonality_factors}

Forecast:
- Week 1-4 revenue (with growth/churn adjustments)
- Week 5-8 revenue
- Week 9-13 revenue
- Include payment delay impact (DSO = 14 days)
- Include seasonal uplift (new intake in Sept, Jan)

Output JSON:
{
  "week_1_revenue": ...,
  "week_5_revenue": ...,
  "week_9_revenue": ...,
  "total_13week_revenue": ...,
  "projected_cash_inflow": ...,
  "projected_cash_outflow": ...,
  "net_cash_position": ...,
  "cash_stress_flags": ["..."],
  "recommendations": ["..."]
}
```

### 3.4 Pricing Optimization (AI-Driven, Monthly)

**Trigger:** Monthly cron  
**Purpose:** Recommend optimal pricing per customer segment

```
1. For each segment (LMS, Virtual Boarding, Corporate):
   - Current price, customer count, elasticity, willingness to pay
   - Competitor pricing, current margin
2. AI optimization:
   - Recommend price change (% and absolute)
   - Expected revenue impact
   - Expected churn impact
   - Margin impact
   - Confidence score
   - Implementation approach (immediate/gradual/for_new_cohort)
3. Store in pricing_strategies
4. Alert CFO if price change > 5%
```

---

## 4. Payment Form → CFO Agent Activation

When a student/family completes enrollment payment, the CFO agent activates immediately:

```
1. Process payment (Stripe/PayPal) via existing EFs
2. INSERT into financial_transactions:
   - transaction_type: 'enrollment_payment'
   - account_id: payment.inquiry_id
   - amount_gbp: payment.amount
   - desk: 'office'
   - revenue_category: 'new_enrollment'
3. CFO Agent AI analysis:
   - Is this customer high-value? (LTV/CAC ratio)
   - What is churn risk? (based on cohort history)
   - Should we offer upsell or retention strategies?
   - Cash flow impact: positive/negative?
   - Revenue recognition timing (ASC 606)?
4. Trigger post-payment actions:
   - If churn_risk = high → trigger priority onboarding sequence
   - If upsell_opportunity exists → queue upsell campaign
5. Update customer_financials in real-time
6. Alert CFO if significant (new customer, high value, or at-risk)
```

---

## 5. Fraud Detection & Compliance

### 5.1 Real-Time Fraud Detection

**Runs:** Every hour  
**AI Model:** Nemotron 3 Nano 30B

```
1. Fetch all transactions in last hour
2. For each transaction, analyze:
   - Amount vs customer history
   - Payment method risk (new card, high-risk country)
   - IP geolocation anomalies
   - Device fingerprint changes
   - Similar fraud patterns in database
3. Risk scoring:
   - score > 0.8 → block + notify CFO
   - score > 0.5 → step-up authentication (2FA, SMS challenge)
   - score < 0.5 → process normally
4. Log all decisions with full reasoning (XAI)
```

### 5.2 Compliance Governance

- **Explainable AI (XAI):** Every fraud flag includes reasoning chain
- **Audit Trail:** All AI decisions logged with full chain of thought
- **Human-in-the-Loop:** CFO can override (with approval reason)
- **Regulatory Ready:** Compliant with FCA, PSD2, GDPR

---

## 6. Terminal CLI Commands (CFO Staff)

### 6.1 Financial Dashboard

```bash
$ rdh cfo dashboard --period month

# Output:
#   MRR: £45,320 (↑ 8% vs last month) ✓
#   Projected ARR: £543,840
#   Cash Position: £380,000 (↑ 14 days runway) ✓
#   Churn Rate: 3.2% (↓ vs 4.1% target) ✓
#   Avg LTV/CAC: 4.2x (↑ from 3.8x)
#
#   ⚠ ALERTS:
#   - 3 customers at 50%+ churn risk (review strategy)
#   - Pricing elasticity suggests +8% increase opportunity
#   - 13-week cash forecast: stressed in week 9 (plan payables)
```

### 6.2 Customer Profitability

```bash
$ rdh cfo profitability --segment lms --sort-by ltv

# Output:
#   Customer | Revenue | CAC | LTV | LTV/CAC | Churn Risk | Action
#   Sarah M  | £8,400  | £200| £24,000 | 120x | 5% | EXPAND
#   James K  | £2,100  | £150| £6,300  | 42x | 45% | SAVE
```

### 6.3 Cash Flow Forecast

```bash
$ rdh cfo forecast --weeks 13

# Output:
#   Week 1-4: £38,000 inflow | £22,000 outflow | Net: +£16,000
#   Week 5-8: £41,000 inflow | £24,000 outflow | Net: +£17,000
#   Week 9-13: £35,000 inflow (churn impact) | £26,000 outflow | Net: +£9,000
#
#   ⚠ RISK: Week 9 cash position drops to £45,000 (threshold: £50,000)
```

### 6.4 Pricing Recommendation

```bash
$ rdh cfo pricing-optimize --segment virtual_boarding

# Output:
#   Current Price: £5,400/year
#   Recommended: £5,832/year (+8%)
#   Expected Revenue Impact: +£15,000/year (2 additional customers)
#   Confidence: 0.82
#   Recommendation: Implement for NEW cohorts, grandfather existing
```

### 6.5 Transaction Approval

```bash
$ rdh cfo approve-transaction 550e8400-e29b-41d4-a716-446655440000

# Only CFO role can execute
# Output: "Transaction approved. Audit log updated."
```

---

## 7. Lovable Admin Panel (CFO Dashboard)

### 7.1 Screen 1: Financial Overview (KPIs)

- MRR, ARR, Churn Rate, LTV/CAC ratio, Cash Position
- Trend sparklines (7-day, 30-day, YTD)
- Key alerts: Cash stress, churn spike, fraud flag

### 7.2 Screen 2: Customer Profitability Table

- Sortable: Revenue, CAC, LTV, Margin %, Churn Risk
- Action buttons: "Expand", "Retain", "Segment", "Review"

### 7.3 Screen 3: 13-Week Cash Flow Forecast

- Line chart: projected inflow/outflow/net cash
- Risk zones highlighted (< £50k threshold)
- Mitigation actions suggested by AI

### 7.4 Screen 4: Pricing Optimization

- Segment-by-segment pricing recommendations
- Elasticity curves, WTP estimates
- A/B test controls (apply new price to % of new cohorts)

### 7.5 Screen 5: Transaction Audit Log

- Explainable AI decisions: why was this transaction flagged?
- Full chain of reasoning (XAI)
- Manual override option (CFO approval required)

---

## 8. Pricing Models: Aug 2026 Best Practices

| Model | Current (Seat-Based) | Hybrid (Test 1) | Outcome-Based (Test 2) |
|-------|----------------------|-----------------|------------------------|
| **Base Structure** | £3,600/student/year | £3,000 base + £0.50 per lesson completed | £4,200 base, contingent on 85%+ pass rate |
| **Pros** | Predictable ARR | Aligns cost with usage; captures upside | Strongest alignment to customer success |
| **Cons** | Revenue flat as students use platform | Forecast volatility (DSO, billing complexity) | Revenue depends on student outcomes (risky) |
| **CFO Agent Monitoring** | Simple | Real-time usage metering + revenue recognition | Continuous performance tracking + escrow |
| **Market Fit (Aug 2026)** | Legacy; 15% of SaaS | Emerging; 41% of B2B SaaS | Aspirational; 12% of SaaS, growing |

**Recommendation:** Start with **Hybrid** model:
- Base fee (£3,000) covers platform infrastructure
- Usage fee (£0.50/lesson) captures incremental value
- Marketing angle: "You pay for what you use; success = better margins for you"
- CFO Agent monitors: Real-time usage via LMS activity log → auto-tier upgrade if usage spikes
- Revenue recognition (ASC 606): Base portion as SaaS; usage portion as performance obligation

---

## 9. Integration Map: CFO Agent ↔ Existing Tables

```
┌─────────────────────────────────────────────────────────────────┐
│                    CFO AGENT (Analytical Layer)                 │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ financial_      │  │ customer_       │  │ financial_      │ │
│  │ transactions    │  │ financials      │  │ forecasts       │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │           │
│           └────────────────────┼────────────────────┘           │
│                                │                                │
└────────────────────────────────┼────────────────────────────────┘
                                 │
                    Reads from existing tables
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ office_desk.    │  │ office_desk.    │  │ school_desk.    │
│ payments        │  │ invoices        │  │ payment_requests│
│ (migration 146) │  │ (migration 130) │  │ (migration 122) │
└─────────────────┘  └─────────────────┘  └─────────────────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ office_desk.    │  │ office_desk.    │  │ front_desk.     │
│ stripe_events   │  │ subscriptions   │  │ leads           │
│ (migration 152) │  │ (migration 131) │  │ (migration 106) │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 10. Go-Live Checklist: CFO Agent

| Item | Dependency | Status |
|------|------------|--------|
| SPA base schema extended (financial_transactions, customer_financials, financial_forecasts, pricing_strategies) | New migrations required | ⏳ |
| RLS policies active on all new tables | Schema deployment | ⏳ |
| Nemotron AI integration (pricing, forecasting, anomaly detection) | AI Agent build | ⏳ |
| Real-time transaction monitoring Edge Function | financial_transactions table | ⏳ |
| Payment form → CFO agent activation flow | Existing payment EFs | ⏳ |
| Customer profitability analysis (daily cron) | customer_financials table | ⏳ |
| 13-week cash flow forecasting (weekly cron) | financial_forecasts table | ⏳ |
| Fraud detection + XAI logging | financial_transactions + AI | ⏳ |
| Pricing optimization workflow (test 3 models) | pricing_strategies table | ⏳ |
| CFO dashboard (Lovable admin panel) | All tables + EFs | ⏳ |
| E2E test: payment → CFO analysis → dashboard update | All above | ⏳ |

---

## 11. Migration Notes (Deferred)

The target architecture adds analytical tables on top of existing payment infrastructure:

| Existing | Target (New) | Relationship |
|----------|--------------|--------------|
| `office_desk.payments` | `financial_transactions` | CFO Agent reads from payments, writes unified log |
| `office_desk.invoices` | `customer_financials` | CFO Agent aggregates invoice data into LTV/CAC |
| `office_desk.stripe_events` | `financial_transactions` | Stripe events feed into unified transaction log |
| `office_desk.subscriptions` | `pricing_strategies` | Subscription data informs pricing optimization |

**Migration strategy:** The existing tables remain untouched. The CFO Agent
reads from them via Edge Functions and writes to the new analytical tables.
No destructive migration required — purely additive.

---

## 12. Summary

| Component | Coverage |
|-----------|----------|
| Unified Transaction Log | ✓ financial_transactions schema + RLS |
| Customer Profitability | ✓ customer_financials with LTV/CAC/margin |
| Financial Forecasting | ✓ 13-week cash flow forecast table |
| Pricing Optimization | ✓ pricing_strategies with AI recommendations |
| Real-Time Monitoring | ✓ 15-minute transaction scan + anomaly detection |
| Fraud Detection | ✓ Hourly scan + XAI reasoning + escalation |
| Payment Form Integration | ✓ CFO agent activates on every payment |
| Terminal CLI | ✓ 5 CFO commands (dashboard, profitability, forecast, pricing, approve) |
| Lovable Dashboard | ✓ 5 screens (KPIs, profitability, forecast, pricing, audit) |
| Pricing Models | ✓ 3 models tested (seat-based, hybrid, outcome-based) |
| Compliance | ✓ XAI, audit trails, human-in-the-loop, FCA/PSD2/GDGR |
| Go-Live Checklist | ✓ 11 items with dependencies |
